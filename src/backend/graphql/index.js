const { ApolloServer } = require('apollo-server-express');
const typeDefs = require('./schema');
const resolvers = require('./resolvers');

const createApolloServer = () => {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => {
      let user = null;
      if (req.headers.authorization) {
        const token = req.headers.authorization.replace('Bearer ', '');
        try {
          const { auth } = require('../middleware/auth');
          const authService = require('../services/authService');
          const decoded = authService.verifyToken(token);
          user = { id: decoded.id, role: decoded.role };
        } catch (error) {
          user = null;
        }
      }
      return { user, req };
    },
    playground: {
      endpoint: '/graphql',
      settings: {
        'editor.theme': 'dark',
        'editor.fontSize': 14,
        'editor.reuseHeaders': true,
        'general.betaUpdates': false,
        'request.credentials': 'same-origin'
      }
    },
    introspection: true,
    formatError: (error) => {
      console.error('GraphQL Error:', error);
      return {
        message: error.message,
        code: error.extensions?.code,
        locations: error.locations,
        path: error.path
      };
    }
  });

  return server;
};

module.exports = { createApolloServer };
