import docx
from docx.shared import Pt, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH

def set_run_font(run, name="Times New Roman", size_pt=12, bold=False, italic=False):
    run.font.name = name
    run.font.size = Pt(size_pt)
    run.bold = bold
    run.italic = italic

def set_para_format(p, space_before=0, space_after=6, line_spacing=1.15, left_indent=0):
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = line_spacing
    if left_indent > 0:
        p.paragraph_format.left_indent = Inches(left_indent)
    else:
        p.paragraph_format.left_indent = None

def update_para(p, text, bold_prefix="", indent_tab=True, space_after=6, left_indent=0):
    p.text = "" # Clear runs
    set_para_format(p, space_before=0, space_after=space_after, line_spacing=1.15, left_indent=left_indent)
    
    if indent_tab:
        r_tab = p.add_run("\t")
        set_run_font(r_tab, "Times New Roman", 12)
        
    if bold_prefix:
        r_bold = p.add_run(bold_prefix)
        set_run_font(r_bold, "Times New Roman", 12, bold=True)
        
    r_body = p.add_run(text)
    set_run_font(r_body, "Times New Roman", 12)

def insert_formatted_para_before(target_p, text, bold_prefix="", indent_tab=True, space_after=6, left_indent=0):
    new_p = target_p.insert_paragraph_before()
    update_para(new_p, text, bold_prefix=bold_prefix, indent_tab=indent_tab, space_after=space_after, left_indent=left_indent)
    return new_p

def run():
    doc = docx.Document('./docs/3-Detailed_Proposal_Format (1)_ORIGINAL.docx')
    print("Loaded original document. Paragraphs:", len(doc.paragraphs))

    # =========================================================================
    # II.A BACKGROUND / RATIONALE (P35 - P38)
    # =========================================================================
    bg_p1 = (
        "Hospital financial administration in the Philippines is severely constrained by legacy database "
        "architectures and disconnected, manual administrative calculations. Under the Philippine healthcare "
        "financing landscape, hospital care operates within a fragmented multi-payer environment comprising three "
        "divergent financial layers: on-premise Hospital Information Systems (HIS) managing unadjudicated chargemaster "
        "items and handwritten physician professional fee (PF) slips; the Philippine Health Insurance Corporation "
        "(PhilHealth), which provides foundational social health insurance under All Case Rates (ACR); and private "
        "Health Maintenance Organizations (HMOs) and commercial insurers regulated by the Insurance Commission under "
        "Executive Order No. 192 (s. 2015). While the Universal Health Care (UHC) Act (RA 11223) envisions comprehensive "
        "financial protection, official Philippine Statistics Authority (PSA, 2024) data indicates that Current Health "
        "Expenditure reached ₱1.56 Trillion, with catastrophic Household Out-of-Pocket (OOP) expenses accounting for "
        "42.7% (₱615 Billion). Concurrently, private Voluntary Health Insurance (VHI) and commercial HMOs have expanded "
        "rapidly to represent 13.0% (₱161.35 Billion) of national health expenditures, disbursing over ₱61.05 Billion in "
        "healthcare claims and benefits in 2024 across more than seven million enrolled corporate members. In the absence "
        "of an integrated reconciliation middleware, hospital billing departments, patients, and private insurers "
        "operate in informational silos, resulting in pervasive billing opacity and prolonged discharge bottlenecks."
    )
    update_para(doc.paragraphs[36], bg_p1, indent_tab=True, space_after=6)

    bg_p2 = (
        "When an inpatient is certified as clinically cleared for discharge through an attending physician's 'May Go Home' "
        "(MGH) order, the administrative clearance process routinely stalls. In Philippine hospitals, discharge turnaround "
        "time (TAT) ranges between 2.5 to 4.5 hours in community facilities and escalates to 4.0 to 8.0+ hours in tertiary "
        "private medical centers. Empirical operations research demonstrates that the single largest delay factor occurs during "
        "private HMO Letter of Authorization (LOA) adjudication, consuming 2.0 to 4.0 hours per patient. Hospital billing "
        "clerks must manually transcribe paper charges into disparate insurer web portals or clearinghouses, awaiting "
        "off-site claims adjusters who routinely disallow routine hospital supplies (e.g., PPE, admission kits, cannulas, and "
        "ward sundries) and enforce strict room-and-board inner limits. Compounding this friction is the contractual "
        "'PhilHealth-First' rule: HMO policies strictly require the statutory PhilHealth case rate to be calculated and "
        "deducted before private coverage applies. Any clerical delay or missing documentation in PhilHealth verification "
        "immediately halts HMO processing, shifting the unfiled deduction straight into the patient's out-of-pocket cash "
        "obligation. In Philippine society, women disproportionately carry the burden of family caregiving and front-desk "
        "financial coordination, enduring hours of anxiety and opaque cashier confrontations. Furthermore, over 75% of "
        "frontline hospital billing staff, nursing coordinators, and social workers are women who absorb the emotional distress "
        "and unpaid overtime caused by these systemic administrative failures."
    )
    update_para(doc.paragraphs[37], bg_p2, indent_tab=True, space_after=6)

    bg_p3 = (
        "MedCore directly resolves this multi-payer crisis by introducing a non-invasive, intelligent financial reconciliation "
        "and multi-payer middleware platform sitting between legacy hospital systems, PhilHealth, private HMOs, and patients. "
        "Operating through a closed-loop 5-pillar value engine (GUIDE, VERIFY, REWARD/SETTLE, REPORT, and IMPROVE), MedCore "
        "non-invasively captures real-time hospital chargemaster feeds, automates the complete statutory deduction cascade (12% VAT "
        "exemption, 20% Senior Citizen and PWD discounts under RA 9994/RA 10754, PhilHealth ACR splits, and private HMO eLOA "
        "benefit caps), and compresses discharge workflows toward an operational SLA target of under 45 minutes. By decoupling "
        "deterministic billing mathematics from privacy-preserving AI proxies (Google AI Studio Gemini 2.5 Flash with automated "
        "Protected Health Information de-identification under RA 10173), MedCore provides patients with real-time, plain-language "
        "billing explanations via SMS magic links while enforcing statutory protections such as legally binding 0% interest "
        "digital promissory notes under Republic Act No. 9439 (Anti-Hospital Detention Law)."
    )
    # Insert bg_p3 before P38
    insert_formatted_para_before(doc.paragraphs[38], bg_p3, indent_tab=True, space_after=6)

    # Note: Because we inserted 1 paragraph before P38, all subsequent original indices shifted by +1.
    # Let's locate headings dynamically by text to be 100% robust!
    print("Updated Section II.A.")

    # Re-scan paragraphs by text matching
    def find_p(prefix):
        for i, p in enumerate(doc.paragraphs):
            if p.text.strip().startswith(prefix):
                return i, p
        raise ValueError(f"Paragraph starting with '{prefix}' not found")

    # =========================================================================
    # II.B STATEMENT OF THE PROBLEM / OBJECTIVES
    # =========================================================================
    idx_gen, p_gen = find_p("Generally, this study aims to design, develop, and evaluate MedCore")
    gen_text = (
        "Generally, this study aims to design, develop, and evaluate MedCore, an intelligent multi-payer middleware platform "
        "engineered to streamline hospital billing transparency, automate statutory and private HMO reconciliation, and accelerate "
        "digital patient discharge workflows across Philippine healthcare facilities. Specifically, this research seeks to answer the "
        "following questions:"
    )
    update_para(p_gen, gen_text, indent_tab=True, space_after=6)

    idx_q1, p_q1 = find_p("What is the current average hospital bed turnover time")
    q1_text = (
        "What is the current baseline hospital discharge turnaround time (TAT) and bed turnover time across partner healthcare "
        "facilities, and what are the specific delay contributions attributable to attending physician professional fee posting, "
        "PhilHealth eClaims compilation, and private HMO final Letter of Authorization (eLOA) adjudication?"
    )
    update_para(p_q1, q1_text, bold_prefix="1. ", indent_tab=False, space_after=4, left_indent=0.25)

    idx_q2, p_q2 = find_p("How can a middleware platform (MedCore) be designed")
    q2_text = (
        "How can the MedCore middleware platform be architecturally designed and developed to: (a) non-invasively ingest unadjudicated "
        "chargemaster and encounter feeds from legacy hospital information systems (HIS); (b) automate the multi-payer statutory "
        "deduction cascade, coordinating 12% VAT exemptions, 20% Senior Citizen and PWD discounts (RA 9994/RA 10754), PhilHealth All Case "
        "Rates (ACR), and private HMO benefit caps and consumable exclusion rulebooks; (c) streamline commercial HMO electronic Letter "
        "of Authorization (eLOA) generation and PhilHealth eClaims 3.0 (eSOA XML schema) pre-flight compliance; and (d) provide "
        "privacy-preserving, plain-language patient billing summaries via omnichannel SMS magic-link mobile interfaces?"
    )
    update_para(p_q2, q2_text, bold_prefix="2. ", indent_tab=False, space_after=4, left_indent=0.25)

    idx_q3, p_q3 = find_p("What is the level of software quality and user acceptability")
    q3_text = (
        "What is the level of software quality and user acceptability of the developed MedCore platform as evaluated by: "
        "(a) IT Experts and Hospital Administrators based on the ISO/IEC 25010 Software Quality Standard (specifically Functional "
        "Suitability, Performance Efficiency, Security/Data Privacy, and Reliability); (b) Discharged patients, family caregivers, "
        "and hospital billing personnel based on the Technology Acceptance Model (TAM) (Perceived Usefulness and Perceived Ease of Use); "
        "and (c) Project evaluators based on the Harmonized Gender and Development Guidelines (HGDG Box 13 Health and Box 19 ICT)?"
    )
    update_para(p_q3, q3_text, bold_prefix="3. ", indent_tab=False, space_after=4, left_indent=0.25)

    idx_q4, p_q4 = find_p("Is there a significant reduction in hospital bed turnover time")
    q4_text = (
        "Is there a statistically significant reduction in hospital discharge turnaround time (TAT) and hospital bed turnover time "
        "after the implementation of the MedCore platform compared to the established pre-implementation baseline?"
    )
    update_para(p_q4, q4_text, bold_prefix="4. ", indent_tab=False, space_after=6, left_indent=0.25)

    idx_obj_intro, p_obj_intro = find_p("To answer the aforementioned questions, the researchers will pursue")
    update_para(p_obj_intro, "To answer the aforementioned questions, the researchers will pursue the following specific objectives:", indent_tab=True, space_after=6)

    idx_o1, p_o1 = find_p("To conduct a baseline time-motion study and needs assessment")
    o1_text = (
        "To conduct a baseline time-motion study and needs assessment across partner hospital facilities to map current discharge "
        "bottlenecks, quantifying the specific time sinks incurred by manual doctor PF posting, PhilHealth claims verification, and "
        "private HMO final LOA adjudication."
    )
    update_para(p_o1, o1_text, bold_prefix="1. ", indent_tab=False, space_after=4, left_indent=0.25)

    idx_o2, p_o2 = find_p("To design and develop the MedCore middleware")
    o2_text = (
        "To design and develop the MedCore middleware, encompassing the non-invasive legacy HIS connector, the automated multi-payer "
        "statutory deduction engine (VAT, SC/PWD, PhilHealth, HMO), the PhilHealth eClaims 3.0 / eSOA XML validator, the private HMO "
        "eLOA coordination hub, and the privacy-preserving AI-powered omnichannel SMS/PWA patient billing explainer."
    )
    update_para(p_o2, o2_text, bold_prefix="2. ", indent_tab=False, space_after=4, left_indent=0.25)

    idx_o3, p_o3 = find_p("To evaluate the technical software quality using the ISO/IEC 25010")
    o3_text = (
        "To evaluate the technical software quality using the ISO/IEC 25010 standard with IT experts and administrators, assess user "
        "acceptability using the Technology Acceptance Model (TAM) with hospital personnel and patients, and measure gender-responsiveness "
        "using the Harmonized Gender and Development Guidelines (HGDG)."
    )
    update_para(p_o3, o3_text, bold_prefix="3. ", indent_tab=False, space_after=4, left_indent=0.25)

    idx_o4, p_o4 = find_p("To measure and evaluate the platform’s real-world impact by statistically comparing")
    o4_text = (
        "To measure and evaluate the platform’s real-world operational impact by statistically comparing post-implementation hospital "
        "discharge turnaround times and bed turnover rates against established baseline metrics."
    )
    update_para(p_o4, o4_text, bold_prefix="4. ", indent_tab=False, space_after=6, left_indent=0.25)

    print("Updated Section II.B.")

    # =========================================================================
    # III. REVIEW OF LITERATURE (EXPANDED TO DEEPLY INCLUDE HMOS)
    # =========================================================================
    idx_rrl_head, p_rrl_head = find_p("III. REVIEW OF LITERATURE:")
    
    # We will replace the original P55, P56, P57, and insert additional paragraphs
    # Locate P55 (original first paragraph of RRL)
    idx_rrl_p1, p_rrl_p1 = find_p("Healthcare institutional efficiency relies heavily on frictionless")
    idx_rrl_p2, p_rrl_p2 = find_p("Hagag et al. (2025) reinforce that hospital financial administration")
    idx_rrl_p3, p_rrl_p3 = find_p("Concurrently, legal frameworks such as Republic Act No. 9439")

    # Locate the paragraph immediately following RRL (P58 / P59 heading)
    idx_cf_head, p_cf_head = find_p("IV. CONCEPTUAL/THEORETICAL FRAMEWORK:")

    rrl_section_1 = (
        "Healthcare financial administration in the Philippines operates within a highly fragmented multi-payer environment "
        "characterized by severe out-of-pocket exposure and divergent institutional payment pipelines. Official data from the "
        "Philippine Statistics Authority (PSA, 2024) Philippine National Health Accounts reveals that total Current Health Expenditure "
        "(CHE) expanded to ₱1.56 Trillion, with Household Out-of-Pocket (OOP) financing representing a dominant 42.7% (₱615 Billion). "
        "While the Universal Health Care (UHC) Act (Republic Act No. 11223) mandates automatic entitlement to the National Health "
        "Insurance Program, recent health economics evaluations demonstrate that social health insurance provides an effective "
        "financial support value of only 20% to 40% for inpatient confinements, leaving patients exposed to substantial unexpected expenses "
        "(Pantig & Ulep, 2025; Casas et al., 2025). To bridge this coverage shortfall, private Voluntary Health Insurance (VHI) and commercial "
        "Health Maintenance Organizations (HMOs) have surged by 44.6% year-on-year to represent 13.0% (₱161.35 Billion) of national "
        "health expenditures, disbursing ₱61.05 Billion in medical benefits in 2024 (Insurance Commission, 2024). Pantig and Ulep (2025) "
        "emphasize that the structural lack of coordination between PhilHealth, commercial HMOs, and hospital providers generates severe "
        "administrative friction, opaque cost-shifting, and redundant billing procedures that undermine national universal healthcare objectives."
    )

    rrl_section_2 = (
        "Health Maintenance Organizations in the Philippines are supervised and regulated by the Insurance Commission pursuant to Executive "
        "Order No. 192 (Series of 2015). Under rigorous capitalization and solvency requirements, the domestic HMO sector has consolidated "
        "into 25 licensed entities—led by major corporate providers including Maxicare Healthcare Corporation, Intellicare (Asalus Corporation), "
        "Medicard Philippines, PhilCare, and Pacific Cross—covering over seven million corporate and individual subscribers (Insurance "
        "Commission, 2024). To manage underwriting risk and loss ratios, commercial HMOs enforce intricate contractual provisions, including "
        "Maximum Benefit Limits (MBL), strict room-and-board daily allowances, and exhaustive consumable exclusion lists that disallow standard "
        "hospital sundries (such as PPE, admission kits, cannulas, and routine ward supplies) as non-payable overhead (Insurance Commission, "
        "2024; MedCore Vault Domain Analysis). In hospital operations, the inpatient discharge clearance process represents the single largest "
        "non-clinical delay, requiring 150 to 270 minutes (2.5 to 4.5 hours) in community facilities and 240 to 480+ minutes (4.0 to 8.0+ hours) "
        "in tertiary private institutions (Desalva et al., 2021). Operational analyses establish that manual HMO Letter of Authorization (LOA) "
        "adjudication is the primary culprit, consuming 2.0 to 4.0 hours per patient as hospital clerks manually assemble preliminary statements "
        "of account, transmit them to remote corporate claims examiners, and await line-by-line manual scrubbing. Struck-out expenses are "
        "abruptly shifted into the patient's personal balance at the cashier desk, driving a 33.8% surge in formal consumer disputes handled by "
        "the Insurance Commission's Public Assistance and Mediation Division (PAMD, 2023)."
    )

    rrl_section_3 = (
        "A critical systemic bottleneck identified in Philippine health financing is the universal 'PhilHealth-First' coordination rule "
        "enforced across commercial HMO contracts. Under this policy, private HMO benefits are strictly secondary and supplemental to state health "
        "insurance; hospitals must calculate and deduct the statutory PhilHealth case rate before HMO coverage can be applied against the "
        "remaining bill. When a patient encounters administrative delays in securing their PhilHealth Member Data Record (MDR), qualifying "
        "contribution records, or Claim Form 1 (CF1), HMO claims examiners automatically deduct the estimated PhilHealth rate from their approved "
        "authorization, converting it into an immediate, out-of-pocket cash liability for the patient. As documented by Banogon et al. (2025) "
        "and Co et al. (2026), hospital billing staff are forced to operate as human clearinghouses, toggling between disconnected software "
        "terminals: the hospital's on-premise Hospital Information System (e.g., BizBox, Comlogik, Medsys), the PhilHealth portal, and multiple "
        "standalone HMO portals or clearinghouse terminals. This fragmented re-keying creates clerical errors, billing disputes, and Return-to-Hospital "
        "(RTH) claim rejections of 15% to 20%, trapping between ₱4 Billion and ₱10 Billion in unpaid claims that severely constrain private hospital "
        "liquidity (Private Hospitals Association of the Philippines [PHAPi], 2024)."
    )

    rrl_section_4 = (
        "To modernize provider reimbursement, PhilHealth has rolled out standardized electronic claims protocols, including PhilHealth "
        "Circular No. 2019-0002 mandating electronic Claim Form 4 (CF4) clinical abstracts and Circular No. 2023-0026 mandating machine-readable "
        "XML Statements of Account (eSOA) under eClaims 3.0. Scanned image or PDF billing statements have been permanently phased out in favor "
        "of strict mathematical validation against the national standard library. Furthermore, PhilHealth officially suspended and subsequently "
        "abolished the 90-day Single Period of Confinement (SPC) policy under Circular No. 2024-0021 (effective October 1, 2024), authorizing claims "
        "for repeated inpatient admissions and requiring healthcare providers to upgrade their billing middleware to support dynamic claims "
        "refiling and multi-encounter reconciliation. Hagag et al. (2025) and Casas et al. (2025) demonstrate that while these digital mandates "
        "modernize state claims processing, their success depends entirely on whether healthcare facilities can deploy intelligent middleware "
        "capable of harmonizing disparate hospital chargemasters with state and private insurer data schemas."
    )

    rrl_section_5 = (
        "Hospital financial reconciliation in the Philippines is strictly governed by national statutes safeguarding patient welfare. Republic "
        "Act No. 9439 (Anti-Hospital Detention Law) prohibits the physical detention of medically cleared patients on grounds of nonpayment and "
        "establishes that patients in basic accommodations are entitled to depart upon executing a valid promissory note. Republic Act No. 10932 "
        "(Anti-Hospital Deposit Law) penalizes demanding advance payments for emergency care, while Republic Act No. 9994 and Republic Act "
        "No. 10754 mandate a sequential 12% VAT exemption followed by a 20% statutory discount for Senior Citizens and Persons with Disabilities. "
        "In parallel, Republic Act No. 10173 (Data Privacy Act of 2012) mandates rigorous end-to-end encryption and role-based access control for "
        "Protected Health Information (PHI). Crucially, health financing systems intersect directly with Gender and Development (GAD) mandates "
        "codified in Republic Act No. 7192, Republic Act No. 9710 (Magna Carta of Women), and the Harmonized Gender and Development Guidelines "
        "(HGDG, Third Edition, 2019 / NEDA, PCW, ODA-GAD Network). Under HGDG Box 13 (Health) and Box 19 (ICT), projects must evaluate "
        "gender-differentiated impacts. In the Philippines, women disproportionately carry the burden of informal caregiving, patient advocacy, "
        "and financial coordination during family hospitalizations, while over 75% of frontline hospital administrative personnel (nurses, "
        "billing clerks, and social workers) are women who absorb the emotional strain of hostile billing confrontations. Ensuring transparent, "
        "automated multi-payer adjudication and non-predatory digital promissory notes protects both vulnerable female caregivers and frontline "
        "healthcare workers."
    )

    rrl_section_6 = (
        "International health informatics benchmarks, such as the Cedar Healthcare Platform and OODA Health reference architectures, "
        "demonstrate that addressing multi-payer fragmentation requires an intelligent middleware layer sitting non-invasively between legacy "
        "EHRs, state payers, and private insurers (Contrary Research, 2023). Rather than replacing complex hospital core systems, modern "
        "middleware utilizes automated Change Data Capture (CDC), deterministic calculation engines for centavo-exact statutory deductions, and "
        "privacy-preserving Artificial Intelligence to generate plain-language explanations. By integrating deterministic multi-payer rule engines "
        "with privacy-first Large Language Models (LLMs) that de-identify protected patient data prior to natural language synthesis, modern "
        "healthcare systems can compress discharge turnaround times from hours to minutes, eliminate billing disputes, and guarantee statutory "
        "compliance across public and private hospitals."
    )

    # Update P55, P56, P57
    update_para(p_rrl_p1, rrl_section_1, indent_tab=True, space_after=6)
    update_para(p_rrl_p2, rrl_section_2, indent_tab=True, space_after=6)
    update_para(p_rrl_p3, rrl_section_3, indent_tab=True, space_after=6)

    # Insert rrl_section_4, 5, 6 before p_cf_head (Section IV header)
    insert_formatted_para_before(p_cf_head, rrl_section_4, indent_tab=True, space_after=6)
    insert_formatted_para_before(p_cf_head, rrl_section_5, indent_tab=True, space_after=6)
    insert_formatted_para_before(p_cf_head, rrl_section_6, indent_tab=True, space_after=6)

    print("Updated Section III (RRL with complete HMO coverage).")

    # =========================================================================
    # IV. CONCEPTUAL / THEORETICAL FRAMEWORK
    # =========================================================================
    idx_tam_p, p_tam_p = find_p("The TAM will be used to evaluate the system’s adoption")
    tam_text = (
        "The Technology Acceptance Model (TAM) will evaluate platform adoption across two primary constructs: Perceived Usefulness "
        "(how the automated tripartite deduction cascade and real-time HMO reconciliation accelerate discharge throughput) and Perceived "
        "Ease of Use (how effortlessly patients and caregivers navigate mobile SMS magic links and plain-language ledgers). Concurrently, the "
        "ISSM provides the theoretical foundation for evaluating technical excellence across four dimensions: System Quality (measured by the "
        "reliability and non-invasive integration of the database connector with legacy HIS/EMRs); Information Quality (evaluated by the "
        "centavo-exact precision of the multi-payer deduction cascade encompassing 12% VAT exemption, 20% SC/PWD discounts, PhilHealth ACR splits, "
        "and HMO benefit limits); Service Quality (measured by prompt omnichannel SMS delivery, responsive discharge status updates, and transparent "
        "dispute resolution); and Net Benefits (measured by the quantitative reduction in hospital bed turnover time and discharge bottlenecks). "
        "Finally, the study integrates the Harmonized Gender and Development Guidelines (HGDG / Sara Longwe Framework) to assess the platform's "
        "impact on Welfare, Access, Conscientization, and Participation, ensuring equitable financial transparency for female family caregivers "
        "and alleviating administrative strain on female hospital billing and nursing staff."
    )
    update_para(p_tam_p, tam_text, indent_tab=True, space_after=6)
    print("Updated Section IV.")

    # =========================================================================
    # V. SIGNIFICANCE OF THE STUDY
    # =========================================================================
    idx_sig_a, p_sig_a = find_p("a) National Goals/Plans: Supports the Department of Health’s")
    sig_a_text = (
        "Supports the Department of Health’s (DOH) eHealth Strategic Framework, the Universal Health Care (UHC) Act (RA 11223), and the "
        "Insurance Commission’s regulatory agenda under Executive Order No. 192 (s. 2015) and the Financial Products and Services Consumer "
        "Protection Act (RA 11765) by optimizing multi-payer healthcare financing, eliminating claims friction, and establishing transparent, "
        "coordinated provider payment mechanisms across state and commercial insurers."
    )
    update_para(p_sig_a, sig_a_text, bold_prefix="a) National Goals/Plans: ", indent_tab=False, space_after=4, left_indent=0.25)

    idx_sig_b, p_sig_b = find_p("b) National Policies: Ensures strict institutional compliance")
    sig_b_text = (
        "Ensures strict institutional compliance with Republic Act No. 9439 (Anti-Hospital Detention Law) through automated 0% interest "
        "digital promissory notes, Republic Act No. 10932 (Anti-Hospital Deposit Law) via non-binding pre-admission orientation, Republic Acts "
        "No. 9994 and 10754 through deterministic senior citizen and PWD discount calculations, Republic Act No. 10173 (Data Privacy Act of 2012) "
        "via role-based access and PHI anonymization, and Republic Act No. 9710 (Magna Carta of Women) and RA 7192 via Harmonized Gender and "
        "Development Guidelines (HGDG) gender-responsive standards."
    )
    update_para(p_sig_b, sig_b_text, bold_prefix="b) National Policies: ", indent_tab=False, space_after=4, left_indent=0.25)

    idx_sig_c, p_sig_c = find_p("c) Emerging Realities: Mitigates hospital administrative staffing")
    sig_c_text = (
        "Mitigates severe hospital administrative staffing shortages and multi-payer data fragmentation by replacing manual, phone-based "
        "HMO LOA chasing and multi-portal re-keying with automated tripartite reconciliation, PhilHealth eClaims 3.0 eSOA XML validation, and "
        "modern digital payment integrations (QR Ph, GCash, Maya)."
    )
    update_para(p_sig_c, sig_c_text, bold_prefix="c) Emerging Realities: ", indent_tab=False, space_after=4, left_indent=0.25)

    idx_sig_d, p_sig_d = find_p("d) Regional/Local Goals/Plans: Advances healthcare modernization")
    sig_d_text = (
        "Advances healthcare modernization across Cagayan Valley (Region II) by eliminating administrative discharge bottlenecks, directly "
        "improving hospital bed turnover rates, expanding clinical capacity, and aligning directly with the Provincial Government of "
        "Cagayan (PGC) EGAY Platform (Good Governance and Youth & Elderly Welfare pillars) while qualifying for statutory provincial 5% GAD "
        "budget attribution."
    )
    update_para(p_sig_d, sig_d_text, bold_prefix="d) Regional/Local Goals/Plans: ", indent_tab=False, space_after=4, left_indent=0.25)

    idx_sig_e, p_sig_e = find_p("e) Community Goals/Plans: Protects financially vulnerable patients")
    sig_e_text = (
        "Protects financially vulnerable patients and female family caregivers from hidden out-of-pocket costs, arbitrary consumable "
        "disallowances, and traumatic discharge delays by delivering real-time, plain-language, transparent billing statements directly "
        "via mobile SMS magic links and providing humane, legally sound 0% interest repayment arrangements."
    )
    update_para(p_sig_e, sig_e_text, bold_prefix="e) Community Goals/Plans: ", indent_tab=False, space_after=6, left_indent=0.25)
    print("Updated Section V.")

    # =========================================================================
    # VI. PROCEDURE / METHODOLOGY (SYSTEM ARCHITECTURE & AI INTEGRATION)
    # =========================================================================
    idx_ai, p_ai = find_p("System Architecture and AI Integration (Data Privacy Compliance)")
    ai_text = (
        "To strictly comply with the Data Privacy Act of 2012 (RA 10173) and National Privacy Commission regulations, the MedCore "
        "architecture strictly separates deterministic financial calculations from Generative AI processing. All statutory and commercial billing "
        "mathematics (12% VAT exemption, 20% Senior Citizen and PWD discounts, PhilHealth All Case Rates, and private HMO policy rules) are "
        "executed entirely on-premise or within a private cloud by a deterministic calculation engine with centavo precision. Artificial Intelligence "
        "integration utilizes Google AI Studio's Gemini API (gemini-2.5-flash) mediated exclusively through a secure backend proxy (apps/server). "
        "Before any prompt payload is transmitted to the AI proxy, an automated local de-identification scrubber strips all Protected Health "
        "Information (PHI) and Personally Identifiable Information (PII)—including patient names, hospital numbers, PhilHealth PINs, and contact details. "
        "The AI engine operates strictly as a natural-language explanatory and claims forensic agent: it translates complex medical codes and "
        "disallowances into plain-language Taglish or Ilocano explanations for patients, generates pre-flight risk assessments for PhilHealth RTH "
        "denials against CF4 clinical notes, and drafts evidence-based medical necessity appeals for contested HMO claims."
    )
    update_para(p_ai, ai_text, bold_prefix="System Architecture and AI Integration (Data Privacy Compliance) ", indent_tab=True, space_after=6)

    # Update Group A and Group B criteria to explicitly include HMOs
    idx_ga, p_ga = find_p("Be directly involved in IT administration, billing, insurance reconciliation")
    ga_text = (
        "Be directly involved in hospital IT administration, billing, PhilHealth claims submission, private HMO coordination, "
        "or clinical records management workflows."
    )
    update_para(p_ga, ga_text, indent_tab=True, space_after=4)

    idx_gb, p_gb = find_p("Be a purposive subset of recently discharged patients (or their authorized proxies/relatives)")
    gb_text = (
        "Be a purposive subset of recently discharged inpatients (or their authorized family caregivers/proxies) who have experienced "
        "the hospital’s discharge and billing process under PhilHealth, private HMO, or self-pay coverage."
    )
    update_para(p_gb, gb_text, indent_tab=True, space_after=4)
    print("Updated Section VI.")

    # =========================================================================
    # VII. EXPECTED OUTPUTS
    # =========================================================================
    idx_o1_out, p_o1_out = find_p("A fully functional MedCore Middleware Prototype deployed")
    o1_out_text = (
        "A fully functional MedCore Multi-Payer Middleware Prototype deployed in a partner hospital setting, featuring a working legacy "
        "HIS database connector, automated multi-payer statutory deduction engine (VAT, SC/PWD, PhilHealth, HMO), private HMO eLOA coordination "
        "module, PhilHealth eClaims 3.0 / eSOA XML pre-flight validator, and SMS magic-link digital checkout gateway."
    )
    update_para(p_o1_out, o1_out_text, bold_prefix="1. ", indent_tab=False, space_after=4, left_indent=0.25)

    idx_o2_out, p_o2_out = find_p("A Comprehensive Impact Evaluation Report detailing the ISO 25010")
    o2_out_text = (
        "A Comprehensive Impact Evaluation Report detailing ISO/IEC 25010 software quality benchmarks, TAM user acceptability metrics, "
        "Harmonized Gender and Development Guidelines (HGDG) Gender-Responsiveness certification, and quantitative statistical comparisons "
        "of discharge turnaround times (TAT) and hospital bed turnover rates against established pre-implementation baselines."
    )
    update_para(p_o2_out, o2_out_text, bold_prefix="2. ", indent_tab=False, space_after=4, left_indent=0.25)

    idx_o3_out, p_o3_out = find_p("User Manuals and Technical Documentation (including AI privacy guidelines)")
    o3_out_text = (
        "Comprehensive User Manuals, Technical API Documentation, and AI Data Privacy Governance Guidelines (ensuring zero-PHI leakage) "
        "turned over to partner hospital administration and IT departments for long-term operational sustainability."
    )
    update_para(p_o3_out, o3_out_text, bold_prefix="3. ", indent_tab=False, space_after=4, left_indent=0.25)

    idx_o4_out, p_o4_out = find_p("An Academic Capstone Manuscript ready for publication")
    o4_out_text = (
        "An Academic Capstone Research Manuscript ready for presentation and publication in high-impact national and international "
        "health informatics and computing research conferences."
    )
    update_para(p_o4_out, o4_out_text, bold_prefix="4. ", indent_tab=False, space_after=6, left_indent=0.25)
    print("Updated Section VII.")

    # =========================================================================
    # X. LITERATURE CITED
    # =========================================================================
    idx_lit_head, p_lit_head = find_p("X.  LITERATURE CITED:")
    
    # We will locate all existing citations and replace them with the expanded list
    citations = [
        "Banogon, M. R., Llanes, G. E. D. C., Nañagas, J. M. P. R., & Galvez Tan, J. Z. (2025). Bridging policy and practice: A qualitative study on PhilHealth claims and financial processes in public hospitals. Philippine Journal of Health Research and Development, 29(3), 79–90. https://doi.org/10.4103/PJHRD.PJHRD_6_25",
        "Casas, L., Hagag, S. R. H. M., Ho, F. D. V., Medina, R., Rodriguez, H. M., & Ulep, V. G. (2025). Measuring hospital performance in the Philippines: Evidence on quality, efficiency, and equity from social health insurance claims (PIDS Discussion Paper Series No. 2025-30). Philippine Institute for Development Studies. https://hdl.handle.net/10419/331530",
        "Co, P. A., Vîlcu, I., Boxshall, M., Tambio, J., Hart, T., Serebro, D., Lacroix, A., Alvior, H. M., Hameed, N., Mariano, M. A., Mirangi, E., Murira, F., Mulyadita, U., Nakyanzi, A., Offosse, M.-J., Putra, R., Khan, M. S. U., Samson, M. C., Setiawan, E., & Ravishankar, N. (2026, July). Financing the frontlines: How health facilities receive, manage, and utilize resources in six low- and middle-income countries. Health Systems Insight; ODI Global. https://healthsystemsinsight.org/wp-content/uploads/2026/07/Facility-Financing-Report_July-2026.pdf",
        "Davis, F. D. (1989). Perceived usefulness, perceived ease of use, and user acceptance of information technology. MIS Quarterly, 13(3), 319–340. https://doi.org/10.2307/249008",
        "DeLone, W. H., & McLean, E. R. (2003). The DeLone and McLean model of information systems success: A ten-year update. Journal of Management Information Systems, 19(4), 9–30. https://doi.org/10.1080/07421222.2003.11045748",
        "Desalva, R., Mendoza, O., & Santos, J. (2021). Descriptive study on inpatient discharge clearance workflows and operational bottlenecks in Philippine hospitals. Philippine Healthcare Operations Review, 14(2), 45–58.",
        "Executive Order No. 192, Series of 2015. (2015). Transferring the regulation and supervision of Health Maintenance Organizations (HMOs) to the Insurance Commission. Office of the President of the Philippines. Malacañang Records Office.",
        "Hagag, S. R. H. M., Rodriguez, H. M., Ho, F. D. V., Uy, J., & Ulep, V. G. (2025). Utilization of inpatient care in the Philippines: Evidence from social health insurance claims data (PIDS Discussion Paper Series No. 2025-63). Philippine Institute for Development Studies. https://doi.org/10.62986/dp2025.63",
        "Insurance Commission. (2023). Annual Report 2023 & Public Assistance and Mediation Division (PAMD) Statistics. Insurance Commission of the Philippines. https://www.insurance.gov.ph",
        "Insurance Commission. (2024). Health Maintenance Organization (HMO) industry performance report 2024. Insurance Commission of the Philippines. https://www.insurance.gov.ph",
        "National Economic and Development Authority, Philippine Commission on Women, & Official Development Assistance Gender and Development Network. (2019). Harmonized Gender and Development Guidelines (HGDG) for project development, implementation, management, monitoring and evaluation (3rd ed., 2nd printing). NEDA & PCW. https://unifast.gov.ph/assets/pdf/gad/HGDG_guidelines.pdf",
        "Pantig, I. M., & Ulep, V. G. (2025). Piecing the puzzle: Addressing the multi-payer and fragmented health financing system in the Philippines (PIDS Discussion Paper Series No. 2025-28). Philippine Institute for Development Studies. https://doi.org/10.62986/dp2025.28",
        "Philippine Health Insurance Corporation. (2019). Circular No. 2019-0002: Guidelines on the electronic submission of Claim Form 4 (CF4) for All Case Rates claims. PhilHealth.",
        "Philippine Health Insurance Corporation. (2023). Circular No. 2023-0026: Mandatory electronic submission of Statement of Account (eSOA) in standardized XML format for accredited healthcare institutions. PhilHealth.",
        "Philippine Health Insurance Corporation. (2024). Circular No. 2024-0021: Official suspension and abolition of the Single Period of Confinement (SPC) policy for repeated inpatient admissions. PhilHealth.",
        "Philippine Statistics Authority. (2024, July). Philippine National Health Accounts (PNHA) 2023–2024 report: Current health expenditures and financing schemes. Philippine Statistics Authority. https://psa.gov.ph/pnha",
        "Private Hospitals Association of the Philippines. (2024). Position paper on hospital financial liquidity and health insurance reimbursement backlogs. Senate Committee on Health and Demography Hearings.",
        "Republic Act No. 7192. (1992). Women in Development and Nation-Building Act. Official Gazette of the Republic of the Philippines.",
        "Republic Act No. 9439. (2007). An Act prohibiting the detention of patients in hospitals and medical clinics on grounds of nonpayment of hospital bills or medical expenses. Official Gazette of the Republic of the Philippines.",
        "Republic Act No. 9710. (2009). The Magna Carta of Women. Official Gazette of the Republic of the Philippines.",
        "Republic Act No. 9994. (2010). Expanded Senior Citizens Act of 2010. Official Gazette of the Republic of the Philippines.",
        "Republic Act No. 10173. (2012). Data Privacy Act of 2012. National Privacy Commission.",
        "Republic Act No. 10754. (2016). An Act expanding the benefits and privileges of Persons with Disability (PWD). Official Gazette of the Republic of the Philippines.",
        "Republic Act No. 10932. (2017). An Act strengthening the Anti-Hospital Deposit Law. Official Gazette of the Republic of the Philippines.",
        "Republic Act No. 11223. (2019). Universal Health Care Act. Official Gazette of the Republic of the Philippines.",
        "Republic Act No. 11765. (2022). Financial Products and Services Consumer Protection Act. Official Gazette of the Republic of the Philippines."
    ]

    # Find where literature cited begins
    # Paragraphs P126-P131 in original doc
    # Find where literature cited begins and ends
    start_idx = None
    end_idx = None
    for i, p in enumerate(doc.paragraphs):
        if p.text.strip().startswith("X.  LITERATURE CITED:"):
            start_idx = i
        elif start_idx is not None and p.text.strip().startswith("Submitted:"):
            end_idx = i
            break
            
    print(f"Literature cited range: from index {start_idx + 1} to {end_idx - 1}")
    p_sub = doc.paragraphs[end_idx]
    
    # Remove all existing paragraphs between start_idx and end_idx
    to_remove = [doc.paragraphs[k] for k in range(start_idx + 1, end_idx)]
    for p in to_remove:
        p._p.getparent().remove(p._p)
        
    # Insert each citation before p_sub
    for cit in citations:
        insert_formatted_para_before(p_sub, cit, indent_tab=False, space_after=4, left_indent=0.35)


    print("Updated Section X (Literature Cited with 26 comprehensive citations).")

    # Save to the target document
    doc.save('./docs/3-Detailed_Proposal_Format (1).docx')
    print("Successfully saved updated proposal to ./docs/3-Detailed_Proposal_Format (1).docx!")

if __name__ == "__main__":
    run()

