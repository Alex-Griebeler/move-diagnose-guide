// A submitted test keeps its media as a flat list (`media_urls`): signed URLs or storage paths, in no fixed order.
// MediaUploader names each file `<prefix>_photo_<timestamp>` or `<prefix>_video_<timestamp>`, and the prefix says
// which slot (view or test) it belongs to. This puts each file back in its slot so the step shows it again and a
// resubmit writes the same list. A file that fits no free slot is kept in `unmatched`, to be written back as it was.
export type MediaSlot = { photoUrl?: string; videoUrl?: string };

export function splitSavedMedia(urls: unknown, prefixes: string[]) {
  const slots: Record<string, MediaSlot> = {};
  const unmatched: string[] = [];
  for (const url of Array.isArray(urls) ? urls : []) {
    if (typeof url !== 'string') continue;
    const path = url.match(/assessment-media\/([^?]+)/)?.[1] ?? url;
    const fileName = path.slice(path.lastIndexOf('/') + 1);
    let placed = false;
    for (const prefix of prefixes) {
      const kind = fileName.startsWith(`${prefix}_photo_`) ? 'photoUrl'
        : fileName.startsWith(`${prefix}_video_`) ? 'videoUrl'
        : null;
      if (kind && !slots[prefix]?.[kind]) {
        slots[prefix] = { ...slots[prefix], [kind]: url };
        placed = true;
        break;
      }
    }
    if (!placed) unmatched.push(url);
  }
  return { slots, unmatched };
}
