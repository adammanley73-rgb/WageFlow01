// C:\Projects\wageflow01\lib\supabase.ts

/* preview: chainable stub so TypeScript + builds stay green */

type QueryResult<T> = { data: T; error: null };

function makeBuilder() {
  const resultList: QueryResult<any[]> = { data: [], error: null };
  const resultSingle: QueryResult<any | null> = { data: null, error: null };

  const b: any = {};

  const chain = () => b;

  // builders (return builder, not Promise)
  b.select = (..._a: any[]) => b;
  b.insert = (..._a: any[]) => b;
  b.update = (..._a: any[]) => b;
  b.upsert = (..._a: any[]) => b;
  b.delete = (..._a: any[]) => b;

  // filters / modifiers
  b.eq = chain;
  b.neq = chain;
  b.in = chain;
  b.like = chain;
  b.ilike = chain;
  b.gte = chain;
  b.lte = chain;
  b.gt = chain;
  b.lt = chain;
  b.or = chain;
  b.match = chain;

  b.order = chain;
  b.range = chain;
  b.limit = chain;

  // typing helpers used in some codebases
  b.returns = (..._a: any[]) => b;

  // terminal methods
  b.single = async (..._a: any[]) => resultSingle;
  b.maybeSingle = async (..._a: any[]) => resultSingle;

  // make it awaitable (await builder -> { data, error })
  b.then = (resolve: any, reject: any) => Promise.resolve(resultList).then(resolve, reject);

  return b;
}

export const supabase = {
  from: (..._a: any[]) => makeBuilder(),
};