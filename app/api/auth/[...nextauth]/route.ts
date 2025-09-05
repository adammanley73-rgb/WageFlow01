authorize(credentials) {
  // Demo user for client testing
  if (credentials?.email === 'demo@wageflow.com' && credentials?.password === 'demo123') {
    return {
      id: '1',
      email: 'demo@wageflow.com',
      name: 'Demo User'
    };
  }

  // Add your existing auth logic here if you have any
  // For now, just return null for any other credentials
  return null;
}