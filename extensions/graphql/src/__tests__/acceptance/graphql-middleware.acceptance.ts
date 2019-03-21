// Copyright IBM Corp. 2019. All Rights Reserved.
// Node module: @loopback/graphql
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {createRestAppClient, givenHttpServerConfig} from '@loopback/testlab';
import {GraphqlTestApplication} from '../fixtures/graphql-test/src';

describe('GraphQL middleware', () => {
  let app: GraphqlTestApplication;

  before(giveAppWithGraphQLMiddleware);
  after(stopApp);

  it('exposes POST /graphql', async () => {
    const client = createRestAppClient(app);
    const expectedData = {
      data: {
        recipe: {
          title: 'Recipe 1',
          description: 'Desc 1',
          ratings: [0, 3, 1],
          creationDate: '2018-04-11T00:00:00.000Z',
          ratingsCount: 1,
          averageRating: 1.3333333333333333,
          ingredients: ['one', 'two', 'three'],
          numberInCollection: 1,
        },
      },
    };
    await client
      .post('/graphql')
      .set('content-type', 'application/json')
      .accept('application/json')
      .send({operationName: 'GetRecipe1', variables: {}, query: example})
      .expect(200, expectedData);
  });

  async function giveAppWithGraphQLMiddleware() {
    app = new GraphqlTestApplication({rest: givenHttpServerConfig()});
    await app.boot();
    await app.start();
    return app;
  }

  async function stopApp() {
    await app?.stop();
  }
});

const example = `query GetRecipe1 {
  recipe(recipeId: "1") {
    title
    description
    ratings
    creationDate
    ratingsCount(minRate: 2)
    averageRating
    ingredients
    numberInCollection
  }
}

query GetRecipes {
  recipes {
    title
    description
    creationDate
    averageRating
    ingredientsLength
    numberInCollection
  }
}

mutation AddRecipe {
  addRecipe(recipe: {
    title: "New recipe"
    description: "Simple description",
    ingredients: [
      "One",
      "Two",
      "Three",
    ],
  }) {
    id
    numberInCollection
    creationDate
  }
}`;
