/* @ts-nocheck */

// Preview stub for admin client
export async function getAdmin() {
  const chain: any = {
    select: (_cols?: string) => chain,
    eq: (_field?: string, _val?: any) => chain,
    single: () => chain,
    data: [],
    error: null
  };
  return {
    client: {
      from: (_table?: string) => chain
    },
    companyId: "preview-company-id"
  };
}
