// Copyright IBM Corp. 2019. All Rights Reserved.
// Node module: @loopback/graphql
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {
  Binding,
  BindingScope,
  config,
  Constructor,
  Context,
  ContextTags,
  createBindingFromClass,
  filterByTag,
  inject,
} from '@loopback/context';
import {lifeCycleObserver, Server} from '@loopback/core';
import {HttpOptions, HttpServer} from '@loopback/http-server';
import {ApolloServer, ApolloServerExpressConfig} from 'apollo-server-express';
import express from 'express';
import {buildSchema, ResolverInterface} from 'type-graphql';
import {LoopBackContainer} from './graphql.container';
import {GraphQLBindings, GraphQLTags} from './keys';

/**
 * Options for GraphQL server
 */
export interface GraphQLServerOptions extends HttpOptions {
  graphql?: ApolloServerExpressConfig;
  express?: Record<string, unknown>;
  asMiddlewareOnly?: boolean;
}

/**
 * GraphQL Server
 */
@lifeCycleObserver('server', {
  scope: BindingScope.SINGLETON,
  tags: {[ContextTags.KEY]: GraphQLBindings.GRAPHQL_SERVER},
})
export class GraphQLServer extends Context implements Server {
  readonly httpServer?: HttpServer;
  readonly expressApp: express.Application;

  constructor(
    @inject.context()
    parent?: Context,
    @config() private options: GraphQLServerOptions = {},
  ) {
    super(parent, 'graphql-server');
    this.expressApp = express();
    if (options.express) {
      for (const p in options.express) {
        this.expressApp.set(p, options.express[p]);
      }
    }

    if (!options.asMiddlewareOnly) {
      this.httpServer = new HttpServer(this.expressApp, this.options);
    }
  }

  getResolvers(): Constructor<ResolverInterface<object>>[] {
    const view = this.createView(filterByTag(GraphQLTags.RESOLVER));
    return view.bindings
      .filter(b => b.valueConstructor != null)
      .map(b => b.valueConstructor as Constructor<ResolverInterface<object>>);
  }

  resolver(resolverClass: Constructor<ResolverInterface<object>>) {
    registerResolver(this, resolverClass);
  }

  async start() {
    const resolverClasses = this.getResolvers();
    // build TypeGraphQL executable schema
    const schema = await buildSchema({
      resolvers: resolverClasses,
      // automatically create `schema.gql` file with schema definition in current folder
      // emitSchemaFile: path.resolve(__dirname, 'schema.gql'),
      container: new LoopBackContainer(this),
    });

    const serverConfig = {
      // enable GraphQL Playground
      playground: true,
      ...this.options.graphql,
      schema,
    };
    // Create GraphQL server
    const graphQLServer = new ApolloServer(serverConfig);

    graphQLServer.applyMiddleware({app: this.expressApp});

    await this.httpServer?.start();
  }

  async stop() {
    await this.httpServer?.stop();
  }

  get listening() {
    return !!this.httpServer?.listening;
  }
}

export function registerResolver(
  ctx: Context,
  resolverClass: Constructor<object>,
): Binding {
  const binding = createBindingFromClass(resolverClass, {
    namespace: GraphQLBindings.RESOLVERS,
  }).tag(GraphQLTags.RESOLVER);
  ctx.add(binding);
  return binding;
}
