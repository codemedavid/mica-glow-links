// Owner announcement restricting who may present our COAs. Short enough to
// show in full, so there is no expand/collapse.
export function CoaNotice() {
  return (
    <section className="coa-notice" aria-labelledby="coa-notice-heading">
      <span className="coa-notice-tag">
        <span aria-hidden="true">🛡️</span> IMPORTANT NOTICE
      </span>
      <h2 id="coa-notice-heading" className="coa-notice-heading">
        About our COAs
      </h2>
      <div className="coa-notice-body">
        <p>
          Unfortunately, <strong>SCAMMERS in CHINA/ OUTSIDE THE PHILIPPINES</strong> have been
          using my COAs to claim that the tested peptides came from them, even though the reports
          already show my name and website.
        </p>
        <p>
          Because of this, I’ve unpublished all my Vanguard results so they can no longer be viewed
          publicly.
        </p>
        <p className="coa-notice-rule">
          <strong>
            ALL COA RESULTS, LAB IDs, UNIQUE KEY/ LAB VERIFICATION CODES are to be used by Mama
            Mica GLW, its ADMINS, and VERIFIED RESELLERS within the PHILIPPINES ONLY.
          </strong>{' '}
          Not authorized for use outside the Philippines. Other vendors are not authorized to
          present this report as their own or as evidence of testing for their products.
        </p>
      </div>
    </section>
  )
}
