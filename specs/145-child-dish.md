# #145: A dish of their own for the child

- **Issue:** #145
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.

## Why

Some days the child eats what the family eats. Other days the child gets a dish of their own: quinoa rice with chicken boiled in, while the adults have dal rice. Today the app plans one dish per meal for everyone, and counts the child in it either way.

## Decisions

- **A meal can have a second dish, "for the child".** It shows under the meal's pick on Today.
- **When the child has their own dish, the main dish is for the adults only.** Its amounts count the adults. When the child shares, they count in the main dish, as now.
- **Child dishes are their own list,** in a new "For children" group of the "Our kitchen" pack (#147). A dish says who it's for: `"for": ["child"]`.
- **Snacks are meals too.** The morning and evening snack slots exist; child dishes fill them.
- **Add-ins:** a dish can take one optional extra, chosen when it's planned. Khichdi with veggies takes egg, chicken or paneer. It works like "Serve with".
- **Seeded from the owner's own list:**
  - Breakfast: apple and oats, pear and oats, blueberries and oats, scrambled eggs with bread, ragi with banana, banana pancakes.
  - Lunch and dinner: khichdi with veggies (add egg, chicken or paneer), palak paneer, matar paneer, beetroot potato tikki, rajma tikki with beetroot carrot soup, quinoa rice with chicken.
  - Snacks: orange, banana, blueberries cut in half, cinnamon rolls, bread and butter.
- **Small round fruit says to cut it.** Blueberries and grapes for a toddler say "Cut in half".

## Acceptance criteria

Each criterion becomes one e2e test, on an Android phone, an iPhone and a desktop (ADR 0002, 0003, 0021).

### 1. a child's own dish

- **Given** two adults and a toddler, lunch for all three
- **When** they press "Add a dish for the child" under lunch's pick, and pick "Khichdi with veggies"
- **Then** lunch shows the main pick, then "For the child: Khichdi with veggies"
- **And** the main dish's page says "For 2 people"

### 2. sharing again

- **Given** lunch with a child's dish
- **When** they press "Remove" on it
- **Then** lunch is one dish again, and its page says "For 3 people"

### 3. an add-in

- **Given** "For the child: Khichdi with veggies"
- **When** they choose "Add egg"
- **Then** it reads "Khichdi with veggies, with egg", and eggs count in what the meal uses

### 4. snacks

- **Given** a toddler who has the evening snack
- **When** they open Today
- **Then** the evening snack has a pick from the child's list, such as "Banana"
- **And** "Blueberries" says "Cut in half"

## Words

English; Hindi, Marathi and Arabic stay preview-only until a native speaker reviews them (ADR 0012).

- Add a dish for the child · For the child: {dish} · Remove · Add {food} · {dish}, with {food} · Cut in half · For children

## Out of scope

- A dish for one named person: the child's dish is for all the household's children.
- Food rules per person (no nuts, no spice): their own spec.
- Toddler portions: a child still counts as one serving.
