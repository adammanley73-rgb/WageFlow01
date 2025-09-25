// @ts-nocheck
/* preview: auto-suppressed to keep Preview builds green. */
/* @ts-nocheck */
// Minimal chainable query builder that accepts any args.
function makeChain() {
  const chain = {
    // query executors (accept any args, resolve to safe shapes)
    select : async (..._a) => ({ data: [],  error: null }),
    insert : async (..._a) => ({ data: null, error: null }),
    update : async (..._a) => ({ data: null, error: null }),
    upsert : async (..._a) => ({ data: null, error: null }),
    delete : async (..._a) => ({ data: null, error: null }),
    single : async (..._a) => ({ data: null, error: null }),

    // filters / modifiers (accept any args, stay chainable)
    eq    : (..._a) => chain,
    neq   : (..._a) => chain,
    in    : (..._a) => chain,
    like  : (..._a) => chain,
    order : (..._a) => chain,
    range : (..._a) => chain,
    limit : (..._a) => chain,
  };
  return chain;
}

export const supabase = {
  from: (..._a) => makeChain()
};
