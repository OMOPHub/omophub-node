export interface VocabReleaseMixin {
  /**
   * Vocabulary release to query (e.g. `"2025.1"`). Sent as a `?vocab_release=`
   * query-string parameter. If the client was constructed with
   * `vocabVersion`, this per-call value takes precedence at the API level.
   */
  vocabRelease?: string;
}
