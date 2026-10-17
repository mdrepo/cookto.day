import type { ReactNode } from "react";
import { useState } from "react";
import {
  Button,
  CheckList,
  Cluster,
  Field,
  Input,
  Note,
  Screen,
} from "@cookto/ui";
import { useShoppingScreen } from "./useShoppingScreen.js";

/** The shopping list, beside the fridge (specs/103). */
export function ShoppingScreen({ bar }: { bar: ReactNode }) {
  const s = useShoppingScreen();
  const [typed, setTyped] = useState("");
  return (
    <Screen
      bar={bar}
      title={s.title}
      action={
        s.items.length > 0 && (
          <Button kind="main" onClick={s.send.run}>
            {s.send.label}
          </Button>
        )
      }
    >
      {s.send.copied && <Note>{s.send.copied}</Note>}
      {s.empty ? (
        <Note>{s.empty}</Note>
      ) : (
        <CheckList label={s.title} items={s.items} />
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          s.add.run(typed);
          setTyped("");
        }}
      >
        <Cluster gap={2} fill>
          <Field label={s.add.nameLabel} id="list-name">
            {(control) => (
              <Input
                {...control}
                value={typed}
                onChange={(e) => {
                  setTyped(e.currentTarget.value);
                }}
              />
            )}
          </Field>
          <Button kind="quiet" type="submit">
            {s.add.addLabel}
          </Button>
        </Cluster>
      </form>
    </Screen>
  );
}
