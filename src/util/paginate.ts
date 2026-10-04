import type { Context } from "../context";

const PREV_ID = "djsk:page:prev";
const NEXT_ID = "djsk:page:next";
const PREV_EMOJI = "⬅️";
const NEXT_EMOJI = "➡️";
const COLLECTOR_TIMEOUT = 5 * 60_000;

/** Raw API component JSON (accepted as-is by discord.js v13 and v14). */
function arrowRow(disabled = false) {
  const button = (custom_id: string, name: string) => ({
    type: 2, // Button
    style: 2, // Secondary
    custom_id,
    emoji: { name },
    disabled,
  });
  return [
    {
      type: 1,
      components: [button(PREV_ID, PREV_EMOJI), button(NEXT_ID, NEXT_EMOJI)],
    },
  ];
}

/**
 * Adds ⬅️/➡️ pagination to `message`, letting `authorId` page through `pages` (already-rendered
 * page bodies, via `render`). Uses buttons, which need no extra gateway intents; falls back to
 * reactions where buttons aren't available (selfbots can't send components), which in turn
 * needs the `GuildMessageReactions` / `DirectMessageReactions` intent.
 *
 * `render(page, index, total)` builds the full message content for a given page — callers
 * control formatting (codeblock wrapping, page footer, etc.) so this utility stays
 * format-agnostic and is reused by both {@link Context.sendResult} and
 * {@link Context.sendCodeblock}.
 *
 * `startIndex` (default `0`) is which page `message` was already sent showing — `jsk sh`
 * passes the last page here, since it sends the tail (most recent output) up front and
 * pagination is for browsing backward into history.
 */
export async function paginate(
  ctx: Context,
  // biome-ignore lint/suspicious/noExplicitAny: cross-library Message duck typing.
  message: any,
  pages: string[],
  render: (page: string, index: number, total: number) => string,
  authorId: string,
  startIndex = 0,
): Promise<void> {
  if (pages.length <= 1) return;

  let index = startIndex;
  const step = (forward: boolean) => {
    index = forward
      ? (index + 1) % pages.length
      : (index - 1 + pages.length) % pages.length;
    return render(pages[index], index, pages.length);
  };

  if (typeof message.createMessageComponentCollector === "function") {
    try {
      await ctx.edit(message, {
        content: render(pages[index], index, pages.length),
        components: arrowRow(),
        allowedMentions: { parse: [] },
      });
      paginateWithButtons(message, step, authorId);
      return;
    } catch (error) {
      // components rejected (e.g. selfbot) — fall through to reactions
      console.error('[djsk] Button pagination failed, using reactions:', error)
    }
  }

  await paginateWithReactions(ctx, message, step, authorId);
}

function paginateWithButtons(
  // biome-ignore lint/suspicious/noExplicitAny: cross-library duck typing.
  message: any,
  step: (forward: boolean) => string,
  authorId: string,
): void {
  // biome-ignore lint/suspicious/noExplicitAny: cross-library duck typing.
  const collector: any = message.createMessageComponentCollector({
    idle: COLLECTOR_TIMEOUT,
  });

  // biome-ignore lint/suspicious/noExplicitAny: cross-library duck typing.
  collector.on("collect", async (interaction: any) => {
    if (interaction.customId !== PREV_ID && interaction.customId !== NEXT_ID)
      return;
    try {
      if (interaction.user.id !== authorId) {
        await interaction.reply({
          content: "Only the command author can page this.",
          flags: 64,
        });
        return;
      }
      await interaction.update({
        content: step(interaction.customId === NEXT_ID),
        components: arrowRow(),
        allowedMentions: { parse: [] },
      });
    } catch {
      // interaction expired or edit failed; the next click retries
    }
  });

  collector.on("end", () => {
    message.edit({ components: arrowRow(true) }).catch(() => {});
  });
}

async function paginateWithReactions(
  ctx: Context,
  // biome-ignore lint/suspicious/noExplicitAny: cross-library duck typing.
  message: any,
  step: (forward: boolean) => string,
  authorId: string,
): Promise<void> {
  try {
    await message.react(PREV_EMOJI);
    await message.react(NEXT_EMOJI);
  } catch {
    return;
  }

  const filter = (
    // biome-ignore lint/suspicious/noExplicitAny: cross-library duck typing.
    reaction: any,
    // biome-ignore lint/suspicious/noExplicitAny: cross-library duck typing.
    user: any,
  ): boolean =>
    !user.bot &&
    user.id === authorId &&
    [PREV_EMOJI, NEXT_EMOJI].includes(reaction.emoji.name);

  // biome-ignore lint/suspicious/noExplicitAny: cross-library duck typing (collector shape differs slightly across forks).
  let collector: any;
  try {
    collector = message.createReactionCollector({
      filter,
      time: COLLECTOR_TIMEOUT,
    });
  } catch {
    return;
  }

  // biome-ignore lint/suspicious/noExplicitAny: cross-library duck typing.
  collector.on("collect", async (reaction: any, user: any) => {
    try {
      await ctx.edit(message, {
        content: step(reaction.emoji.name === NEXT_EMOJI),
        allowedMentions: { parse: [] },
      });
    } catch {
      // transient edit failure; the next reaction will retry
    }

    try {
      await reaction.users.remove(user.id);
    } catch {
      // missing permission (e.g. DMs) — the user can un-react and re-react manually instead
    }
  });
}
