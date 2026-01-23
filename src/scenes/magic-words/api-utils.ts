export interface MessageInfo {
  name: string;
  text: string;
}
export interface EmojiSource {
  name: string;
  url: string;
}
export interface AvatarInfo {
  name: string;
  url: string;
  position: 'left' | 'right';
}
export interface ConversationData {
  dialogue: MessageInfo[];
  emojies: EmojiSource[];
  avatars: AvatarInfo[];
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isConversationData(value: unknown): value is ConversationData {
  if (!isRecord(value)) return false;

  const dialogue = value.dialogue;
  const emojies = value.emojies;
  const avatars = value.avatars;

  if (!Array.isArray(dialogue) || !Array.isArray(emojies) || !Array.isArray(avatars)) return false;

  if (!dialogue.every(m => isRecord(m) && typeof m.name === 'string' && typeof m.text === 'string')) return false;
  if (!emojies.every(e => isRecord(e) && typeof e.name === 'string' && typeof e.url === 'string')) return false;
  if (
    !avatars.every(
      a =>
        isRecord(a) &&
        typeof a.name === 'string' &&
        typeof a.url === 'string' &&
        (a.position === 'left' || a.position === 'right')
    )
  ) {
    return false;
  }

  return true;
}