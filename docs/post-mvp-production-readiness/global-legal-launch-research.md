# Global legal and operational launch research

> Research snapshot: 4 October 2026. This is a product-launch checklist, not legal or tax advice. A qualified Indian lawyer and chartered accountant should confirm the conclusions for the final operator, customer locations, payment flow, and hosting vendors before paid launch.

## Executive view

Srotiva can run a limited, free beta before its final company and domain are settled, but it should not present a nonexistent company as the operator. The public documents must identify the real current operator, provide a working privacy/support contact, and accurately describe the beta's data handling. Before taking payments, settle the entity, business address, invoicing and tax model, consumer grievance process, and cross-border VAT/sales-tax approach.

“Available worldwide” is a legal and tax choice, not only a hosting choice. Actively marketing to or accepting consumers in the EU and UK can bring their privacy and consumer rules into scope. Direct digital-service sales to foreign consumers can also create VAT obligations at the customer's location. A controlled launch by market is safer than enabling every country by default.

## Decisions required before any public beta

1. **Name the real operator.** Until an entity exists, use the founder's full legal name, trading as Srotiva if appropriate. Do not use “Srotiva Inc.”, “Srotiva Ltd.”, or similar language without registration. Obtain counsel's view on whether a trade-name or local registration is needed in the founder's state.
2. **Choose the audience.** State that the beta is for adults and business/professional use, and do not knowingly allow users under 18. India's DPDP framework defines a child as under 18 and will impose verifiable-parental-consent duties when its substantive provisions commence; US COPPA separately applies to child-directed services and services with actual knowledge of collecting from children under 13 ([DPDP Act](https://www.meity.gov.in/static/uploads/2024/02/Digital-Personal-Data-Protection-Act-2023.pdf), [FTC COPPA guidance](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions)).
3. **Use a monitored contact.** `gouresh5901@gmail.com` can be a clearly labelled temporary support/privacy address for a private beta. Replace it with domain mail before public or paid launch. Publish exact support hours and timezone only after the owner chooses them; “weekdays during Indian business hours” is too ambiguous for an operational commitment.
4. **Keep beta tracking minimal.** Use only necessary authentication/security cookies until analytics and consent requirements have been mapped. Do not add advertising pixels or behavioural profiling by default.
5. **Publish truthful documents.** Privacy, Terms, Acceptable Use, Contact/Support, and crawler/robots documentation must describe the real product and vendors. Do not paste generic claims such as “we never transfer data internationally” or “GDPR compliant” without evidence.
6. **Create a data map and incident owner.** Record every personal-data field, purpose, lawful basis/permission, processor, storage region, retention period, deletion path, and export path. Name one person responsible for security and regulatory incidents.

## India baseline

### Entity and public identity

India permits several operating structures, including sole proprietorship, LLP, OPC, and private limited company. A sole proprietorship is quick but has no separate legal personality and gives the owner unlimited liability; private limited companies and LLPs provide limited liability but add formation and ongoing compliance ([Startup India entity overview](https://www.startupindia.gov.in/content/sih/en/about-startup-india-initiative/international/go-to-market-guide/types-of-businesses.html)).

Practical staging:

- A free, low-risk beta may operate under the founder's real identity after a lawyer/CA confirms local registrations and tax treatment.
- Form the chosen entity before paid subscriptions, material contracts, hiring, or storing materially more customer data. A private limited company is usually the structure to evaluate if equity fundraising is likely; an LLP can be evaluated for a bootstrapped business. This is a decision for counsel/CA, not a product-team assumption.
- Once formed, every legal page, invoice, payment account, vendor contract, domain registration, and privacy notice must consistently name that entity.

The Consumer Protection (E-Commerce) Rules use broad definitions covering electronic facilities for the sale of goods or services. They require an e-commerce entity to display its legal name, geographic address, website and customer-care/grievance contacts, maintain a grievance mechanism, acknowledge complaints within 48 hours, and redress them within one month ([official Rules](https://consumeraffairs.nic.in/sites/default/files/E%20commerce%20rules_0.pdf)). Whether and how these provisions apply to this direct SaaS and to a pre-incorporation operator needs an Indian consumer-law opinion before paid launch; do not assume a support email alone is sufficient.

### Privacy status on 4 October 2026

The Digital Personal Data Protection Act, 2023 and final DPDP Rules, 2025 have **phased commencement**, not one start date:

- Institutional and rulemaking provisions commenced on 13 November 2025.
- The Consent Manager provision and Rule 4 commence on 13 November 2026. This is principally the registration framework for Consent Managers, not a requirement that an ordinary SaaS become one.
- The principal processing duties—notice/consent, security, breach notification, erasure, children, data-principal rights, grievance handling, and most penalties—are scheduled to commence on **13 May 2027**.

The dates come from the official [Act commencement notification, G.S.R. 843(E)](https://www.meity.gov.in/static/uploads/2025/11/c56ceae6c383460ca69577428d36828b.pdf) and [DPDP Rules, G.S.R. 846(E)](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf). The implementation should be built ahead of May 2027 rather than waiting for enforcement.

Until the transition completes, counsel should confirm the continuing application of the Information Technology Act and the 2011 SPDI Rules. Those rules include a published privacy-policy requirement and safeguards for sensitive personal data ([official SPDI Rules](https://www.meity.gov.in/writereaddata/files/GSR3_10511%281%29.pdf)).

Minimum DPDP-ready design now:

- versioned, plain-language collection notices tied to specific purposes;
- evidence of the notice and affirmative consent where consent is used;
- access, correction, export, erasure, withdrawal, and grievance workflows;
- processor/subprocessor contracts and an up-to-date vendor register;
- documented retention periods and deletion jobs;
- reasonable technical/organisational safeguards and a breach playbook;
- a child-access position and enforcement mechanism;
- a named India contact for privacy communications.

CERT-In's directions separately require covered organisations to designate a point of contact, retain ICT logs securely for a rolling 180 days within India, and report specified serious cyber incidents—including data breaches/leaks—within six hours, initially with the information available ([CERT-In directions](https://cert-in.org.in/PDF/CERT-In_Directions_70B_28.04.2022.pdf), [official FAQ](https://www.cert-in.org.in/PDF/FAQs_on_CyberSecurityDirections_May2022.pdf)). Confirm the exact application to the chosen entity and hosting/logging architecture; document the reporting path before launch.

### Tax, payments, and records

Before charging anyone, obtain a CA decision memo covering:

- entity and PAN/bank/accounting setup;
- GST registration timing and place-of-supply treatment;
- whether supplies qualify as export of services and the required invoices/LUT/evidence;
- foreign-currency receipts and FEMA/RBI/payment-provider records;
- TDS, books, return type, and audit triggers;
- treatment of refunds, credits, discounts, and free trials.

Government guidance confirms that business/professional income has its own return and record-keeping framework ([Income Tax Department](https://www.incometax.gov.in/iec/foportal/help/all-topics/e-filing-services/file-itr-4-sugam-online)). GST thresholds and exceptions depend on facts such as state, supply type, and cross-border status; do not encode a generic internet threshold into launch decisions.

## International reach

### EU GDPR

The GDPR can apply to an India-based operator where processing relates to offering goods or services to people in the EU—even without payment—or monitoring their behaviour there. Mere website accessibility is not automatically targeting, but an announced worldwide service, EU-focused marketing, EU currencies/languages, or intentionally onboarding EU residents strengthens the territorial connection. Article 27 may also require a written EU representative when Article 3(2) applies, subject to a narrow occasional/low-risk exception ([GDPR Articles 3 and 27](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679)).

Before targeting EU users, establish lawful bases, an Article 13/14-complete notice, processor agreements, data-subject request handling, breach assessment, retention rules, international-transfer safeguards, and an EU-representative decision. Avoid non-essential cookies until a compliant consent mechanism exists.

### UK GDPR

The UK GDPR likewise applies to organisations outside the UK that target goods/services to people in the UK or monitor their behaviour ([ICO territorial-scope guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/personal-information-what-is-it/who-does-the-uk-gdpr-apply-to/)). A privacy notice should identify the operator and representative if applicable, purposes and lawful bases, data categories, recipients, transfers, retention, rights, complaint route, and automated decision-making where relevant ([ICO privacy-information checklist](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/what-privacy-information-should-we-provide/)). Obtain counsel's decision on a UK representative and transfer mechanism before active UK marketing.

### United States

There is no single general US privacy law. Applicability varies by state, volume, revenue, data sale/sharing, and data type:

- California's CCPA applies to for-profit businesses doing business in California that cross any listed threshold: over $25 million gross annual revenue; buying/selling/sharing data of at least 100,000 California residents or households; or deriving at least 50% of annual revenue from selling California residents' personal information ([California Attorney General](https://oag.ca.gov/privacy/ccpa)).
- Colorado reaches businesses targeting Colorado that process 100,000 Colorado consumers, or 25,000 while receiving revenue/discount from selling data ([Colorado Attorney General](https://coag.gov/resources/colorado-privacy-act/)).
- Virginia uses 100,000 consumers, or 25,000 plus over 50% of gross revenue from personal-data sales ([Virginia Code](https://law.lis.virginia.gov/vacode/title59.1/chapter53/section59.1-576/)).
- Texas has broader coverage but generally exempts federally defined small businesses, except that even a small business must obtain consent before selling sensitive data ([Texas Attorney General](https://www.texasattorneygeneral.gov/consumer-protection/file-consumer-complaint/consumer-privacy-rights/texas-data-privacy-and-security-act)).

Do not treat being below California's threshold as a nationwide exemption. Track users by state without collecting more data than necessary, prohibit sale of personal data and targeted advertising for the beta, and re-run a state-law assessment before US marketing, material scale, or new analytics. Maintain a single baseline access/correction/deletion/appeal process where feasible.

### Foreign consumer tax

For paid launch, determine whether Srotiva is an electronically supplied/digital service and whether customers are businesses or consumers:

- Non-EU businesses can use the EU non-Union One Stop Shop to report qualifying B2C VAT in one member state rather than registering in every member state ([European Commission OSS explanation](https://vat-one-stop-shop.ec.europa.eu/system/files/2021-07/vatecommerceexplanatory_notes_28102020_en.pdf)).
- An overseas business supplying taxable digital services to UK consumers may need UK VAT registration regardless of value ([HMRC digital-services guidance](https://www.gov.uk/guidance/the-vat-rules-if-you-supply-digital-services-to-private-consumers), [VAT Notice 700/1](https://www.gov.uk/government/publications/vat-notice-7001-should-i-be-registered-for-vat/vat-notice-7001-should-i-be-registered-for-vat)).
- EU consumer-facing sales also require clear pre-contract information about the trader, service, price, contract, and relevant digital functionality; EU protections can apply to non-EU traders targeting EU consumers ([Your Europe official guidance](https://europa.eu/youreurope/citizens/consumers/shopping/contract-information/index_en.htm)).

Before direct global B2C billing, compare a merchant-of-record service—which may handle indirect-tax collection and remittance—with being merchant of record yourself. Counsel/CA must still verify contracts, refunds, permanent-establishment risk, and the taxes the provider does not cover.

## Required public documents

### Privacy notice

Identify the real operator and contact; enumerate account, URL/feed, content, device/log, support, and payment data; explain purposes and legal bases; name or categorise processors and hosting regions; state international transfers; give retention periods or criteria; explain rights and grievance/complaint routes; cover security, children, cookies, deletion/export, and policy-change notice. Link it at every data-collection point, not only the footer.

### Terms of service

Cover operator identity, eligibility and authority, beta status, account security, acceptable URLs and content, crawler/robots policy, prohibited bypasses, ownership/licences, generated-feed responsibility, service changes, suspension/termination, disclaimers, liability, indemnity, governing law/disputes, contact, and change notice. Add pricing, billing, taxes, renewals, cancellation, refunds, and consumer-law savings only when payments exist.

### Contact and grievance page

For beta, display the temporary email and say messages are reviewed on weekdays during stated Indian Standard Time hours once those hours are chosen. Do not promise a response SLA the team cannot measure. Before paid India launch, add the legal entity, geographic address, customer-care details, named/designated grievance contact, acknowledgement/redress expectations, and complaint tracking appropriate to the consumer-law advice.

### Operational records not necessarily public

Maintain a vendor/subprocessor register, processing inventory, retention schedule, consent/notice versions, rights-request log, complaint log, incident register, tax nexus register, terms/privacy version acceptance, and change approvals. Never put private home-address details into source control; inject final legal contact data through a reviewed content/configuration path.

## Staged recommendation

### Stage A — free pre-revenue beta

- Limit access and describe it explicitly as beta; no paid plans or auto-renewal.
- Operate under the founder's truthful legal identity after local counsel/CA confirmation.
- Use the temporary Gmail address for support/privacy only; choose and publish exact IST hours.
- Publish beta Terms, Privacy, Acceptable Use, and Contact pages.
- Essential cookies only; no ad tech, data sale, or behavioural targeting.
- Adults/business use only; do not knowingly onboard under-18 users.
- Complete the data map, retention schedule, deletion/export workflow, vendor register, and incident/CERT-In playbook.
- Either avoid actively targeting EU/UK consumers until representation/transfer questions are answered, or complete that review before onboarding them.

### Stage B — paid public launch

- Form and consistently disclose the selected entity; establish business banking, accounting, and a defensible business address.
- Replace Gmail with domain-based support, privacy, security, and grievance aliases feeding monitored owners.
- Obtain Indian counsel sign-off on Terms, Privacy, consumer disclosures, grievance process, crawler/content/IP risks, and entity display requirements.
- Obtain CA sign-off on GST, exports, FEMA/payment records, invoicing, income tax, and merchant-of-record versus direct billing.
- Decide supported countries. Configure checkout to block countries not yet approved rather than claiming unrestricted worldwide sales.
- Complete EU/UK GDPR representative and international-transfer decisions before targeting those markets.
- Implement country/state tax handling, B2B tax-ID validation, price/tax disclosures, cancellation/refund rules, and durable purchase confirmations.
- Schedule a compliance review before 13 May 2027 for the substantive DPDP commencement.

## Exact owner, lawyer, and accountant questions

### Owner decisions

1. What is the founder/operator's full legal name, Indian state, and safe public business address?
2. Is the first release invite-only, free public beta, B2B-only, or open to consumers?
3. Which countries will be intentionally marketed to and accepted at signup and checkout?
4. What exact support window applies—for example, Monday–Friday, 10:00–18:00 IST—and which Indian holidays are excluded?
5. What response target is operationally realistic, and will it be a target rather than a contractual SLA?
6. Will analytics, error monitoring, emails, hosting, database, and payments process data outside India? List every vendor and region.
7. Will any user be allowed under 18? Recommended launch answer: no.
8. Will feeds or extracted content ever be public by default? What takedown/abuse channel will exist?

### Indian lawyer

1. May this beta legally operate as a sole proprietorship under the proposed trade name, and what state/local registrations are required?
2. Do the Consumer Protection (E-Commerce) Rules apply to this direct SaaS? If so, what entity form, address, phone, grievance-officer identity, response process, and disclosures are mandatory?
3. Can a compliant service/virtual office be used as the public geographic address without exposing a residence?
4. Are Srotiva's feed extraction, caching, republication, robots handling, and takedown process adequate for Indian copyright, contract, and intermediary risk?
5. What liability cap, indemnity, governing law, arbitration/court, and consumer carve-outs are enforceable for the intended markets?
6. What remains applicable under the IT Act/SPDI Rules until 13 May 2027, and what must change on that date under DPDP?
7. Does the architecture satisfy CERT-In point-of-contact, India log-retention, time synchronisation, and six-hour reporting duties?
8. Does actively serving EU/UK users require EU and UK representatives now, or does an exception defensibly apply?

### Chartered accountant / international tax adviser

1. Which structure—proprietorship, LLP, OPC, or private limited—best fits expected revenue, liability, fundraising, compliance cost, and founder count?
2. When is GST registration required for the actual launch facts, and are subscriptions exports of services? What LUT, invoices, location evidence, and remittance records are needed?
3. What FEMA/RBI and bank/payment-processor records are required for overseas subscription receipts and refunds?
4. Which income-tax return, books, TDS, advance-tax, audit, and transfer-pricing obligations apply?
5. Is Srotiva an electronically supplied service for EU/UK and other jurisdictions? Which B2C taxes arise from the first sale?
6. Should launch use a merchant of record? Exactly which tax, invoicing, refund, chargeback, and filing duties would remain with Srotiva?
7. What customer-location evidence and business-tax-ID validation must checkout retain, and for how long?
8. Which countries/states should checkout initially block until registrations are complete?

## Review cadence

Review this document when the domain, entity, hosting region, analytics stack, payment provider, target countries, or pricing model changes; immediately after a significant incident; before paid launch; and no later than April 2027 for the May 2027 DPDP phase.
