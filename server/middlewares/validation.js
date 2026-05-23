const { z } = require('zod');

// Schema representing the proposal JSON structure from sdd.md and conflict_validation_pipeline.md
const eventProposalSchema = z.object({
  organizationId: z.number({
    required_error: 'organizationId is required',
    invalid_type_error: 'organizationId must be an integer',
  }).int().positive(),
  
  venueId: z.number({
    required_error: 'venueId is required',
    invalid_type_error: 'venueId must be an integer',
  }).int().positive(),
  
  startTime: z.string({
    required_error: 'startTime is required',
  }).datetime({
    message: 'startTime must be a valid ISO 8601 UTC timestamp',
  }),
  
  endTime: z.string({
    required_error: 'endTime is required',
  }).datetime({
    message: 'endTime must be a valid ISO 8601 UTC timestamp',
  }),
  
  metadata: z.object({
    title: z.string({
      required_error: 'metadata.title is required',
    }).min(3, {
      message: 'metadata.title must be at least 3 characters long',
    }).max(100, {
      message: 'metadata.title cannot exceed 100 characters',
    }),
    
    description: z.string().optional().default(''),
    
    tags: z.array(z.string()).default([]),
  }, {
    required_error: 'metadata is required',
  }),
}).refine((data) => {
  const start = new Date(data.startTime);
  const end = new Date(data.endTime);
  return start < end;
}, {
  message: 'startTime must be strictly before endTime',
  path: ['endTime'],
});

/**
 * Middleware to validate event proposals.
 * Appends validated and sanitized data to req.validatedBody.
 */
const validateProposal = (req, res, next) => {
  const result = eventProposalSchema.safeParse(req.body);
  
  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: 'JSON Schema validation failed',
      errors: result.error.issues.map(err => ({
        path: err.path.join('.'),
        message: err.message,
      })),
    });
  }
  
  req.validatedBody = result.data;
  next();
};

module.exports = {
  validateProposal,
  eventProposalSchema,
};
