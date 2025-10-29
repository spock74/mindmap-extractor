import zod from 'zod';
import { NODE_TYPE_COLORS } from '../constants';

const { z } = zod;

// Extract valid node types from the constants to be used in the enum.
const validNodeTypes = Object.keys(NODE_TYPE_COLORS) as [string, ...string[]];

// Schema for a subject or object node ('s' or 'o').
// It must have a non-empty label and a valid type from our list.
const S_O_NodeSchema = z.object({
  label: z.string().min(1, { message: "Node label cannot be empty." }),
  type: z.enum(validNodeTypes)
});

// Schema for a single triplet, containing a subject, predicate, and a nullable object.
const TripletSchema = z.object({
  s: S_O_NodeSchema,
  p: z.string().min(1, { message: "Predicate 'p' cannot be empty." }),
  o: S_O_NodeSchema.nullable(),
});

// The main schema for the entire JSON object.
// It expects a root object with a 'triplets' key which is an array of our TripletSchema.
export const JsonDataSchema = z.object({
  triplets: z.array(TripletSchema),
});