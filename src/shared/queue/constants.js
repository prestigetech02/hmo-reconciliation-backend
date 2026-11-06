'use strict';

/**
 * Queue name constants.
 * Define all queue names here so they are never
 * typed as raw strings anywhere else in the codebase.
 */
const QUEUES = {
  DOCUMENT_PROCESSING: 'document-processing',
  RECONCILIATION: 'reconciliation',
};

/**
 * Job name constants per queue.
 */
const JOBS = {
  PARSE_IMPORT_BATCH: 'parse-import-batch',
  RUN_RECONCILIATION: 'run-reconciliation',
};

module.exports = { QUEUES, JOBS };
