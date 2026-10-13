import { ItemList, Stack, Tag } from "@cookto/ui";
import { useUseSoon } from "./useUseSoon.js";

/** Food that needs using, at the top of Today (the prototype's "Use soon"). */
export function UseSoon() {
  const u = useUseSoon();
  if (u.rows.length === 0) return null;
  return (
    <Stack gap={2}>
      <h2>{u.title}</h2>
      <ItemList
        label={u.title}
        items={u.rows.map((r) => ({
          key: r.key,
          name: r.name,
          line: r.line,
          end: <Tag tone="warn">{r.warning}</Tag>,
          onOpen: r.onOpen,
        }))}
      />
    </Stack>
  );
}
