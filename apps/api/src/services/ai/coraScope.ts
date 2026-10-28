import type { CoraLanguage } from './prompts/coraPrompts';

export function obviousRestrictedRequest(message: string): boolean {
  return /(?:ignore|disregard|override|forget|bypass)\s+(?:all\s+)?(?:the\s+)?(?:previous|prior|above|system|developer|safety|security)\s+(?:instructions?|rules?|prompts?|policy)|(?:reveal|print|show|give|dump|expose)\b.{0,45}\b(?:system prompt|developer prompt|api[ _-]?key|password|secret|access token)|(?:show|list|fetch|reveal|access|give me)\b.{0,45}\b(?:other patients?|another patient|all patients?)\b.{0,45}\b(?:records?|bills?|names?|data|details)/i.test(
    message.normalize('NFKC'),
  );
}

export function coraPolicyNotice(decision: 'OUT_OF_SCOPE' | 'RESTRICTED', language: CoraLanguage): string {
  const notices = {
    en: {
      OUT_OF_SCOPE:
        'I can help with your hospital stay, bill, HMO, PhilHealth, payments and discharge. Please ask about one of those.',
      RESTRICTED:
        'I can only discuss your own hospital information. I cannot reveal private records or system details, or give treatment advice. Ask your ward nurse or attending doctor about medical care.',
    },
    fil: {
      OUT_OF_SCOPE:
        'Makakatulong ako sa hospital stay, bill, HMO, PhilHealth, payments at discharge ninyo. Magtanong po tungkol sa mga iyon.',
      RESTRICTED:
        'Sarili ninyong hospital information lang ang puwede kong talakayin. Hindi ako nagbibigay ng private records, system details o treatment advice. Para sa medical care, kausapin ang ward nurse o attending doctor.',
    },
    tl: {
      OUT_OF_SCOPE:
        'Maaari kitang tulungan tungkol sa iyong pananatili sa ospital, bayarin, HMO, PhilHealth, mga pagbabayad at paglabas. Magtanong tungkol sa mga ito.',
      RESTRICTED:
        'Sarili mong impormasyon sa ospital lamang ang maaari kong talakayin. Hindi ako nagbibigay ng pribadong talaan, lihim ng sistema o payo sa paggamot. Kumonsulta sa nars o iyong doktor tungkol sa pangangalagang medikal.',
    },
    ilo: {
      OUT_OF_SCOPE:
        'Makatulongak iti hospital stay, bill, HMO, PhilHealth, payment ken discharge yo. Agdamag maipapan kadagitoy.',
      RESTRICTED:
        'Sarili yo a hospital information laeng ti mabalin nga ilawlawagko. Saanak nga mangted iti private records, system details wenno treatment advice. Agsarita iti ward nurse wenno attending doctor para iti medical care.',
    },
  };
  return notices[language][decision];
}
