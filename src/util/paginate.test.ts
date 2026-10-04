import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import { Context } from "../context";
import { Jishaku } from "../jishaku";
import { paginate } from "./paginate";

function makeJsk(): Jishaku {
  // biome-ignore lint/suspicious/noExplicitAny: minimal fake client for tests.
  return new Jishaku({ token: "t0ken-fake" } as any, {
    consoleLog: false,
    catchProcessErrors: false,
  });
}

function makeCtx(): Context {
  const jsk = makeJsk();
  // biome-ignore lint/suspicious/noExplicitAny: minimal fake message for tests.
  const message = { channel: {}, author: { id: "owner-1" } } as any;
  const source = { kind: "message" as const, message };
  return new Context(jsk, source, "js", "");
}

function makeReactableMessage() {
  const react = vi.fn(async () => {});
  const edit = vi.fn(async (payload: unknown) => ({ payload }));
  const collector = new EventEmitter();
  const createReactionCollector = vi.fn(
    (_options: { filter: unknown; time: number }) => collector,
  );
  // biome-ignore lint/suspicious/noExplicitAny: minimal fake message for tests.
  const message = { react, edit, createReactionCollector } as any;
  return { message, react, edit, createReactionCollector, collector };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function makeButtonMessage() {
  const edit = vi.fn(async (payload: unknown) => ({ payload }));
  const collector = new EventEmitter();
  const createMessageComponentCollector = vi.fn(
    (_options: unknown) => collector,
  );
  const react = vi.fn(async () => {});
  // biome-ignore lint/suspicious/noExplicitAny: minimal fake message for tests.
  const message = { edit, react, createMessageComponentCollector } as any;
  return { message, edit, collector, react };
}

function click(customId: string, userId = "owner-1") {
  return {
    customId,
    user: { id: userId },
    update: vi.fn(async () => {}),
    reply: vi.fn(async () => {}),
  };
}

describe("paginate (buttons)", () => {
  it("adds arrow buttons instead of reactions", async () => {
    const ctx = makeCtx();
    const { message, edit, react } = makeButtonMessage();

    await paginate(ctx, message, ["a", "b"], (p) => p, "owner-1");

    expect(react).not.toHaveBeenCalled();
    const payload = edit.mock.calls[0][0] as {
      content: string;
      components: { components: { custom_id: string }[] }[];
    };
    expect(payload.content).toBe("a");
    expect(payload.components[0].components.map((b) => b.custom_id)).toEqual([
      "djsk:page:prev",
      "djsk:page:next",
    ]);
  });

  it("moves forward and wraps backward on clicks, starting from startIndex", async () => {
    const ctx = makeCtx();
    const { message, collector } = makeButtonMessage();

    await paginate(ctx, message, ["a", "b", "c"], (p) => p, "owner-1", 2);

    const next = click("djsk:page:next");
    collector.emit("collect", next);
    await flush();
    expect(next.update).toHaveBeenCalledWith(
      expect.objectContaining({ content: "a" }),
    );

    const prev = click("djsk:page:prev");
    collector.emit("collect", prev);
    await flush();
    expect(prev.update).toHaveBeenCalledWith(
      expect.objectContaining({ content: "c" }),
    );
  });

  it("rejects clicks from anyone but the author", async () => {
    const ctx = makeCtx();
    const { message, collector } = makeButtonMessage();

    await paginate(ctx, message, ["a", "b"], (p) => p, "owner-1");

    const other = click("djsk:page:next", "someone-else");
    collector.emit("collect", other);
    await flush();
    expect(other.update).not.toHaveBeenCalled();
    expect(other.reply).toHaveBeenCalledOnce();
  });

  it("falls back to reactions when components are rejected", async () => {
    const ctx = makeCtx();
    const { message, edit, react } = makeButtonMessage();
    edit.mockRejectedValueOnce(new Error("Cannot send components"));
    message.createReactionCollector = vi.fn(() => new EventEmitter());

    await paginate(ctx, message, ["a", "b"], (p) => p, "owner-1");

    expect(react).toHaveBeenNthCalledWith(1, "⬅️");
  });
});

describe("paginate (reaction fallback)", () => {
  it("does nothing for a single page", async () => {
    const ctx = makeCtx();
    const { message, react, createReactionCollector } = makeReactableMessage();

    await paginate(ctx, message, ["only page"], (p) => p, "owner-1");

    expect(react).not.toHaveBeenCalled();
    expect(createReactionCollector).not.toHaveBeenCalled();
  });

  it("reacts with both arrows and sets up a collector for multiple pages", async () => {
    const ctx = makeCtx();
    const { message, react, createReactionCollector } = makeReactableMessage();

    await paginate(ctx, message, ["a", "b", "c"], (p) => p, "owner-1");

    expect(react).toHaveBeenNthCalledWith(1, "⬅️");
    expect(react).toHaveBeenNthCalledWith(2, "➡️");
    expect(createReactionCollector).toHaveBeenCalledOnce();
  });

  it("advances to the next page on ➡️ and edits the message", async () => {
    const ctx = makeCtx();
    const { message, edit, collector } = makeReactableMessage();
    const render = vi.fn(
      (page: string, index: number, total: number) =>
        `${page} (${index + 1}/${total})`,
    );

    await paginate(ctx, message, ["a", "b", "c"], render, "owner-1");

    const remove = vi.fn(async () => {});
    collector.emit(
      "collect",
      { emoji: { name: "➡️" }, users: { remove } },
      { id: "owner-1", bot: false },
    );
    await flush();

    expect(edit).toHaveBeenCalledWith({
      content: "b (2/3)",
      allowedMentions: { parse: [] },
    });
    expect(remove).toHaveBeenCalledWith("owner-1");
  });

  it("wraps around to the last page on ⬅️ from the first page", async () => {
    const ctx = makeCtx();
    const { message, edit, collector } = makeReactableMessage();

    await paginate(ctx, message, ["a", "b", "c"], (p) => p, "owner-1");

    collector.emit(
      "collect",
      { emoji: { name: "⬅️" }, users: { remove: vi.fn(async () => {}) } },
      { id: "owner-1", bot: false },
    );
    await flush();

    expect(edit).toHaveBeenCalledWith({
      content: "c",
      allowedMentions: { parse: [] },
    });
  });

  it("passes a filter to the collector that only accepts authorId and the arrow emojis", async () => {
    const ctx = makeCtx();
    const { message, createReactionCollector } = makeReactableMessage();

    await paginate(ctx, message, ["a", "b"], (p) => p, "owner-1");

    // Real discord.js enforces `filter` before ever emitting 'collect', so that's what
    // actually restricts who can page through the result — verify it rejects everyone else.
    const { filter } = createReactionCollector.mock.calls[0][0] as {
      filter: (
        reaction: unknown,
        user: { id: string; bot: boolean },
      ) => boolean;
    };
    expect(
      filter({ emoji: { name: "➡️" } }, { id: "someone-else", bot: false }),
    ).toBe(false);
    expect(
      filter({ emoji: { name: "➡️" } }, { id: "owner-1", bot: true }),
    ).toBe(false);
    expect(
      filter({ emoji: { name: "😀" } }, { id: "owner-1", bot: false }),
    ).toBe(false);
    expect(
      filter({ emoji: { name: "➡️" } }, { id: "owner-1", bot: false }),
    ).toBe(true);
  });
});
