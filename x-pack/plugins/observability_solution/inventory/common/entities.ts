/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { ENTITY_LATEST, entitiesAliasPattern } from '@kbn/entities-schema';
import { isRight } from 'fp-ts/lib/Either';

export const entityTypeRt = t.union([
  t.literal('service'),
  t.literal('host'),
  t.literal('container'),
]);

export type EntityType = t.TypeOf<typeof entityTypeRt>;

export const MAX_NUMBER_OF_ENTITIES = 500;

export const ENTITIES_LATEST_ALIAS = entitiesAliasPattern({
  type: '*',
  dataset: ENTITY_LATEST,
});

const BUILTIN_SERVICES_FROM_ECS_DATA = 'builtin_services_from_ecs_data';
const BUILTIN_HOSTS_FROM_ECS_DATA = 'builtin_hosts_from_ecs_data';
const BUILTIN_CONTAINERS_FROM_ECS_DATA = 'builtin_containers_from_ecs_data';

export const defaultEntityDefinitions = [
  BUILTIN_SERVICES_FROM_ECS_DATA,
  BUILTIN_HOSTS_FROM_ECS_DATA,
  BUILTIN_CONTAINERS_FROM_ECS_DATA,
];

export const defaultEntityTypes: EntityType[] = ['service', 'host', 'container'];

const entityArrayRt = t.array(entityTypeRt);
export const entityTypesRt = new t.Type<EntityType[], string, unknown>(
  'entityTypesRt',
  entityArrayRt.is,
  (input, context) => {
    if (typeof input === 'string') {
      const arr = input.split(',');
      const validation = entityArrayRt.decode(arr);
      if (isRight(validation)) {
        return t.success(validation.right);
      }
    } else if (Array.isArray(input)) {
      const validation = entityArrayRt.decode(input);
      if (isRight(validation)) {
        return t.success(validation.right);
      }
    }

    return t.failure(input, context);
  },
  (arr) => arr.join()
);
