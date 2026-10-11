export type CoraLanguage = 'en' | 'fil' | 'ilo';
export type CoraMode = 'GENERAL' | 'WHY_DO_I_OWE' | 'DISCHARGE_STATUS' | 'PROMISSORY_ASSISTANCE' | 'DISPUTE_DRAFT';
export interface CoraHistoryTurn { role: 'user' | 'assistant'; content: string }
export const EXPLAIN_MY_BILL_QUERY = 'Explain my bill: what are my charges, deductions, payments and remaining balance, and why do I still owe this amount?';
export const CORA_WELCOME: Record<CoraLanguage, string> = {
  en: "Hello, I'm Cora. Ask me about your hospital stay, bill, HMO, PhilHealth, payments or discharge.",
  fil: 'Hello, ako si Cora. Magtanong tungkol sa hospital stay, bill, HMO, PhilHealth, payments o discharge ninyo.',
  ilo: 'Kablaaw, siak ni Cora. Agdamag maipapan iti hospital stay, bill, HMO, PhilHealth, payment wenno discharge yo.'
};

// Welcome belongs to the first manual opening of this patient's conversation.
// An explicit explain-bill opening sends its question immediately, without a welcome.
export class CoraOpeningPolicy {
  private started = false;
  reset() { this.started = false; }
  open(query?: string, autoSend = false): { welcome: boolean; autoQuery?: string } {
    const welcome = !this.started && !(autoSend && query?.trim());
    this.started = true;
    return { welcome, autoQuery: autoSend ? query?.trim() || undefined : undefined };
  }
}

export function coraHistory(messages: Array<{ sender: 'patient' | 'cora'; text: string; isError?: boolean; isWelcome?: boolean; isNotice?: boolean }>): CoraHistoryTurn[] {
  return messages.filter(m => !m.isError && !m.isWelcome && !m.isNotice)
    .slice(-8).map(m => ({ role: m.sender === 'patient' ? 'user' : 'assistant', content: m.text.slice(0, 1000) }));
}

export const CORA_QUESTIONS: Record<CoraLanguage, string[]> = {
  en: [
    'Why do I still have a balance?', 'Which charges am I paying for?', 'Explain my PhilHealth deduction.',
    'What did my HMO approve?', 'Which items are excluded by my HMO?', 'What is my HMO benefit limit?',
    'Why is there a room upgrade charge?', 'Explain the doctor’s professional fee.', 'Why was this medicine billed to me?',
    'Were my unused medicines credited?', 'What senior citizen or PWD deductions were applied?', 'How much have I already paid?',
    'Where can I see my receipts?', 'How do I pay through the app?', 'What does my payment status mean?',
    'Do I have a promissory arrangement?', 'When is my next installment due?', 'How can I question an incorrect charge?',
    'What is my dispute status?', 'What is my current discharge stage?', 'Which clearance steps are still pending?',
    'Has my final HMO authorization arrived?', 'Where can I get my discharge documents?', 'Who is my attending doctor?',
    'What is my hospital’s address and contact number?', 'What are the recorded visiting hours?'
  ],
  fil: [
    'Bakit may natitira pa akong balance?', 'Aling charges ang babayaran ko?', 'Ipaliwanag ang PhilHealth deduction ko.',
    'Ano ang inapprove ng HMO ko?', 'Aling items ang hindi covered ng HMO?', 'Ano ang benefit limit ng HMO ko?',
    'Bakit may room upgrade charge?', 'Ipaliwanag ang professional fee ng doktor.', 'Bakit naka-charge sa akin ang gamot na ito?',
    'Nabawas ba ang mga hindi nagamit na gamot?', 'Anong Senior Citizen o PWD deductions ang na-apply?', 'Magkano na ang naibayad ko?',
    'Saan ko makikita ang receipts ko?', 'Paano magbayad sa app?', 'Ano ang ibig sabihin ng payment status ko?',
    'May promissory arrangement ba ako?', 'Kailan ang susunod kong installment?', 'Paano ko ikukuwestiyon ang maling charge?',
    'Ano ang status ng dispute ko?', 'Anong discharge stage ko ngayon?', 'Anong clearance steps pa ang kulang?',
    'Dumating na ba ang final HMO authorization?', 'Saan makukuha ang discharge documents?', 'Sino ang attending doctor ko?',
    'Ano ang address at contact number ng hospital?', 'Anong visiting hours ang nakatala?'
  ],
  ilo: [
    'Apay nga adda pay nabati a balance?', 'Ania dagiti charges nga bayadak?', 'Ilawlawag ti PhilHealth deduction ko.',
    'Ania ti inapprove ti HMO ko?', 'Ania dagiti items a saan a covered ti HMO?', 'Ania ti benefit limit ti HMO ko?',
    'Apay nga adda room upgrade charge?', 'Ilawlawag ti professional fee ti doktor.', 'Apay nga na-charge kaniak daytoy nga agas?',
    'Na-credit kadi dagiti saan a nausar nga agas?', 'Ania ti Senior Citizen wenno PWD deductions nga na-apply?', 'Mano ti nabayadkon?',
    'Sadino a makita dagiti receipts ko?', 'Kasanu ti agbayad iti app?', 'Ania ti kayat a sawen ti payment status ko?',
    'Adda kadi promissory arrangement ko?', 'Kaano ti sumaruno nga installment ko?', 'Kasanu ti agdamag maipapan iti saan a husto a charge?',
    'Ania ti status ti dispute ko?', 'Ania ti discharge stage ko ita?', 'Ania pay dagiti clearance steps a kulang?',
    'Dimtengen kadi ti final HMO authorization?', 'Sadino ti discharge documents ko?', 'Asino ti attending doctor ko?',
    'Ania ti address ken contact number ti hospital?', 'Ania ti nakarekord a visiting hours?'
  ]
};
