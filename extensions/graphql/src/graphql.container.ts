// Copyright IBM Corp. 2019. All Rights Reserved.
// Node module: @loopback/graphql
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {
  Binding,
  Constructor,
  Context,
  createBindingFromClass,
  filterByKey,
  filterByTag,
} from '@loopback/context';
import {filterByServiceInterface} from '@loopback/core';
import debugFactory from 'debug';
import {ContainerType, ResolverData} from 'type-graphql';
import {GraphQLBindings, GraphQLTags} from './keys';

const debug = debugFactory('loopback:graphql:container');

export class GraphQLResolutionContext extends Context {
  constructor(
    parent: Context,
    readonly resolverClass: Constructor<unknown>,
    readonly resolverData: ResolverData<unknown>,
  ) {
    super(parent);
    this.bind(GraphQLBindings.RESOLVER_DATA).to(resolverData);
    this.bind(GraphQLBindings.RESOLVER_CLASS).to(resolverClass);
  }
}

export class LoopBackContainer implements ContainerType {
  constructor(readonly ctx: Context) {}
  get(
    resolverClass: Constructor<unknown>,
    resolverData: ResolverData<unknown>,
  ) {
    debug('Resolving a resolver %s', resolverClass.name, resolverData);
    const resolutionCtx = new GraphQLResolutionContext(
      this.ctx,
      resolverClass,
      resolverData,
    );
    const resolverBinding = createBindingFromClass(resolverClass, {
      defaultNamespace: 'resolvers',
    });
    const bindings = this.ctx
      .find(filterByServiceInterface(resolverClass))
      .filter(filterByTag(GraphQLTags.RESOLVER));
    if (bindings.length === 0) {
      debug(
        'Resolver %s not found in context %s',
        resolverClass.name,
        this.ctx.name,
      );
      resolutionCtx.add(resolverBinding);
      return resolutionCtx.getValueOrPromise(resolverBinding.key);
    }

    let found: Readonly<Binding> | undefined;
    if (bindings.length === 1) {
      found = bindings[0];
    } else {
      found = bindings.find(filterByKey(resolverBinding.key));
      if (!found) {
        found = bindings.find(filterByTag(resolverBinding.tagMap));
      }
      if (!found) {
        found = bindings[0];
      }
    }

    debug(
      'Resolver %s found in context %s',
      resolverClass.name,
      this.ctx.name,
      found,
    );
    return this.ctx.getValueOrPromise(found.key);
  }
}
