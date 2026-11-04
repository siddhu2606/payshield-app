// Warning screens in English, Hindi and Marathi. Scams target people in their own language, so the pause should
// speak it too. Covers the safety check, the risk result, story vs facts, message labels, call banners and the
// lock screen. The language is saved per person (settings.lang) and can be read aloud.

export const LANGS = [['en', 'EN'], ['hi', 'हिंदी'], ['mr', 'मराठी']];
export const SPEECH_LANG = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN' };

const S = {
  en: {
    tier: {
      LOW: ['Low', 'Looks normal', 'Nothing unusual about this payment.'],
      MEDIUM: ['Medium', 'Take a moment', 'A couple of things are different from your usual payments. If someone asked you to pay, check with them on a number you already know.'],
      HIGH: ['High', 'Someone may be pressuring you', 'Take a moment before you continue. Real police, banks and companies never ask you to pay to stay safe.'],
      CRITICAL: ['Critical', 'Stop. This looks like a scam pattern', 'We strongly recommend not sending this money. Hang up, then call the organisation on a number you find yourself.']
    },
    risk: (l) => `${l} risk`, why: 'Why we paused',
    cancel: 'Cancel payment', ask: (n) => `Ask ${n} to check`, noContact: 'No trusted contact set', postpone: 'Postpone',
    review: 'I still want to pay: send for review', wait: (s) => `Continue after review (${s}s)`, continuePay: (a) => `Continue and pay ${a}`,
    checkedPay: (a) => `I’ve checked, pay ${a}`, verify: 'I’ll verify first', later: 'Pay later',
    helpline: 'If someone is threatening you, hang up. Report it on the national cyber-crime helpline 1930 or at cybercrime.gov.in.',
    svf: { title: 'Story vs facts', said: 'You said it’s', is: 'This account is', individual: 'Personal account', business: 'Business account', government: 'Government account', opened: (n) => `opened ${n} day${n === 1 ? '' : 's'} ago`, paid: (n) => `paid by ${n} ${n === 1 ? 'person' : 'people'} today`, notFound: 'Not found in the payee registry' },
    checkIntro: 'Answer honestly. Nobody else sees these answers, and you can skip.', whoAsked: 'Who asked you to make this payment, and what is it for?',
    yes: 'Yes', no: 'No', seeResult: 'See result', skip: 'Skip the questions',
    readAloud: 'Read this warning aloud', langLabel: 'Warning language',
    linkTitle: 'Opened from a link in a message', linkBody: (f) => `From ${f}. You didn’t type these details. PayShield will check this payment before any money moves.`,
    callTitle: (k) => `You’re on a ${k === 'internet' ? 'WhatsApp or internet' : 'phone'} call`, callBody: 'Detected on this phone by PayShield. If the caller is asking you to pay, verify, or install an app, hang up first. Police and banks never ask for money on a call.',
    shareTitle: 'Your screen is being shared', shareBody: 'Someone else may be able to see this phone. Stop screen sharing before you pay or enter any PIN.',
    lockTitle: 'Phone locked by PayShield', lockBody: (r) => `${r}. The call was ended. Payments, messages and account details are hidden until this phone is unlocked.`, lockCallback: 'If someone calls back asking for money, don’t answer. Report it on 1930.',
    verdict: { scam: ['Likely scam', 'This message matches a scam pattern. Don’t pay from it. If you’re worried, call the organisation on a number you find yourself.'], suspicious: ['Be careful', 'Parts of this message are often used by scammers. Check it another way before you act.'], ok: ['No warning signs', 'Nothing unusual found. Still, never share a PIN or OTP.'] }
  },
  hi: {
    tier: {
      LOW: ['कम', 'सब सामान्य लग रहा है', 'इस भुगतान में कुछ भी असामान्य नहीं है।'],
      MEDIUM: ['मध्यम', 'एक पल रुकिए', 'यह भुगतान आपके सामान्य भुगतानों से थोड़ा अलग है। अगर किसी ने आपसे पैसे भेजने को कहा है, तो पहले उनसे ऐसे नंबर पर बात करें जो आपको पहले से पता हो।'],
      HIGH: ['उच्च', 'हो सकता है कोई आप पर दबाव डाल रहा है', 'आगे बढ़ने से पहले रुकिए। असली पुलिस, बैंक या कंपनियाँ सुरक्षित रहने के लिए कभी पैसे नहीं माँगतीं।'],
      CRITICAL: ['गंभीर', 'रुकिए। यह धोखाधड़ी जैसा लग रहा है', 'हमारी सलाह है कि यह पैसे न भेजें। फ़ोन काटें, फिर संस्था को खुद ढूँढे हुए नंबर पर कॉल करें।']
    },
    risk: (l) => `${l} जोखिम`, why: 'हमने क्यों रोका',
    cancel: 'भुगतान रद्द करें', ask: (n) => `${n} से जाँच करवाएँ`, noContact: 'कोई भरोसेमंद व्यक्ति नहीं जोड़ा गया', postpone: 'बाद में करें',
    review: 'फिर भी भेजना है: जाँच के लिए भेजें', wait: (s) => `जाँच के बाद आगे बढ़ें (${s} से.)`, continuePay: (a) => `आगे बढ़ें और ${a} भेजें`,
    checkedPay: (a) => `मैंने जाँच कर ली है, ${a} भेजें`, verify: 'पहले खुद पुष्टि करें', later: 'बाद में भेजें',
    helpline: 'अगर कोई आपको धमका रहा है, तो फ़ोन काट दें। राष्ट्रीय साइबर अपराध हेल्पलाइन 1930 पर या cybercrime.gov.in पर शिकायत करें।',
    svf: { title: 'कहानी बनाम तथ्य', said: 'आपने कहा यह है', is: 'यह खाता है', individual: 'निजी खाता', business: 'व्यावसायिक खाता', government: 'सरकारी खाता', opened: (n) => `${n} दिन पहले खुला`, paid: (n) => `आज ${n} लोगों ने पैसे भेजे`, notFound: 'पेयी रजिस्ट्री में नहीं मिला' },
    checkIntro: 'ईमानदारी से जवाब दें। ये जवाब कोई और नहीं देखता, और आप चाहें तो छोड़ सकते हैं।', whoAsked: 'यह भुगतान करने को किसने कहा, और यह किस लिए है?',
    yes: 'हाँ', no: 'नहीं', seeResult: 'नतीजा देखें', skip: 'सवाल छोड़ें',
    readAloud: 'चेतावनी सुनें', langLabel: 'चेतावनी की भाषा',
    linkTitle: 'मैसेज के लिंक से खोला गया', linkBody: (f) => `${f} से। ये जानकारी आपने खुद नहीं लिखी। पैसे जाने से पहले PayShield इस भुगतान की जाँच करेगा।`,
    callTitle: (k) => `आप ${k === 'internet' ? 'WhatsApp या इंटरनेट' : 'फ़ोन'} कॉल पर हैं`, callBody: 'PayShield ने इस फ़ोन पर पहचाना। अगर कॉल करने वाला पैसे भेजने, पुष्टि करने या कोई ऐप डालने को कह रहा है, तो पहले फ़ोन काटें। पुलिस और बैंक कभी कॉल पर पैसे नहीं माँगते।',
    shareTitle: 'आपकी स्क्रीन शेयर हो रही है', shareBody: 'कोई और यह फ़ोन देख सकता है। भुगतान करने या PIN डालने से पहले स्क्रीन शेयरिंग बंद करें।',
    lockTitle: 'PayShield ने फ़ोन लॉक किया', lockBody: () => 'आपके भरोसेमंद व्यक्ति ने एक भुगतान रोका। कॉल काट दी गई। फ़ोन अनलॉक होने तक भुगतान, मैसेज और खाते की जानकारी छुपी रहेगी।', lockCallback: 'अगर कोई दोबारा कॉल करके पैसे माँगे, तो जवाब न दें। 1930 पर शिकायत करें।',
    verdict: { scam: ['संभावित धोखाधड़ी', 'यह मैसेज धोखाधड़ी के पैटर्न से मिलता है। इससे भुगतान न करें। चिंता हो तो संस्था को खुद ढूँढे गए नंबर पर कॉल करें।'], suspicious: ['सावधान रहें', 'इस मैसेज के कुछ हिस्से अक्सर ठग इस्तेमाल करते हैं। कुछ करने से पहले दूसरे तरीके से जाँचें।'], ok: ['कोई चेतावनी नहीं', 'कुछ असामान्य नहीं मिला। फिर भी कभी PIN या OTP न बताएँ।'] }
  },
  mr: {
    tier: {
      LOW: ['कमी', 'सर्व सामान्य दिसत आहे', 'या पेमेंटमध्ये काहीही असामान्य नाही.'],
      MEDIUM: ['मध्यम', 'एक क्षण थांबा', 'हे पेमेंट तुमच्या नेहमीच्या पेमेंटपेक्षा थोडे वेगळे आहे. कोणी पैसे पाठवायला सांगितले असेल, तर आधी त्यांना तुमच्या माहितीतल्या नंबरवर फोन करून खात्री करा.'],
      HIGH: ['जास्त', 'कोणीतरी तुमच्यावर दबाव आणत असेल', 'पुढे जाण्याआधी थांबा. खरे पोलीस, बँका किंवा कंपन्या सुरक्षित राहण्यासाठी कधीही पैसे मागत नाहीत.'],
      CRITICAL: ['गंभीर', 'थांबा. हा फसवणुकीचा प्रकार दिसतो', 'हे पैसे पाठवू नका असा आमचा ठाम सल्ला आहे. फोन ठेवा, आणि त्या संस्थेला तुम्ही स्वतः शोधलेल्या नंबरवर फोन करा.']
    },
    risk: (l) => `${l} धोका`, why: 'आम्ही का थांबवले',
    cancel: 'पेमेंट रद्द करा', ask: (n) => `${n} यांना तपासायला सांगा`, noContact: 'विश्वासू व्यक्ती जोडलेली नाही', postpone: 'नंतर करा',
    review: 'तरीही पाठवायचे आहे: तपासणीसाठी पाठवा', wait: (s) => `तपासणीनंतर पुढे जा (${s} से.)`, continuePay: (a) => `पुढे जा आणि ${a} पाठवा`,
    checkedPay: (a) => `मी खात्री केली आहे, ${a} पाठवा`, verify: 'आधी स्वतः खात्री करा', later: 'नंतर पाठवा',
    helpline: 'कोणी धमकी देत असेल तर फोन ठेवा. राष्ट्रीय सायबर गुन्हे हेल्पलाइन 1930 वर किंवा cybercrime.gov.in वर तक्रार करा.',
    svf: { title: 'कथा विरुद्ध तथ्य', said: 'तुम्ही सांगितले हे आहे', is: 'हे खाते आहे', individual: 'वैयक्तिक खाते', business: 'व्यावसायिक खाते', government: 'सरकारी खाते', opened: (n) => `${n} दिवसांपूर्वी उघडले`, paid: (n) => `आज ${n} लोकांनी पैसे पाठवले`, notFound: 'पेयी रजिस्ट्रीत सापडले नाही' },
    checkIntro: 'प्रामाणिकपणे उत्तर द्या. ही उत्तरे इतर कोणीही पाहत नाही, आणि तुम्ही वगळूही शकता.', whoAsked: 'हे पेमेंट करायला कोणी सांगितले, आणि ते कशासाठी आहे?',
    yes: 'हो', no: 'नाही', seeResult: 'निकाल पाहा', skip: 'प्रश्न वगळा',
    readAloud: 'इशारा ऐका', langLabel: 'इशाऱ्याची भाषा',
    linkTitle: 'मेसेजमधील लिंकवरून उघडले', linkBody: (f) => `${f} कडून. ही माहिती तुम्ही स्वतः टाइप केलेली नाही. पैसे जाण्याआधी PayShield हे पेमेंट तपासेल.`,
    callTitle: (k) => `तुम्ही ${k === 'internet' ? 'WhatsApp किंवा इंटरनेट' : 'फोन'} कॉलवर आहात`, callBody: 'PayShield ने या फोनवर ओळखले. कॉल करणारा पैसे पाठवायला, खात्री करायला किंवा अ‍ॅप टाकायला सांगत असेल तर आधी फोन ठेवा. पोलीस आणि बँका कधीही कॉलवर पैसे मागत नाहीत.',
    shareTitle: 'तुमची स्क्रीन शेअर होत आहे', shareBody: 'दुसरे कोणी हा फोन पाहू शकते. पेमेंट करण्याआधी किंवा PIN टाकण्याआधी स्क्रीन शेअरिंग बंद करा.',
    lockTitle: 'PayShield ने फोन लॉक केला', lockBody: () => 'तुमच्या विश्वासू व्यक्तीने एक पेमेंट थांबवले. कॉल बंद केला. फोन अनलॉक होईपर्यंत पेमेंट, मेसेज आणि खात्याची माहिती लपवलेली राहील.', lockCallback: 'कोणी पुन्हा फोन करून पैसे मागितले तर उत्तर देऊ नका. 1930 वर तक्रार करा.',
    verdict: { scam: ['संभाव्य फसवणूक', 'हा मेसेज फसवणुकीच्या प्रकाराशी जुळतो. यावरून पेमेंट करू नका. काळजी वाटत असल्यास संस्थेला स्वतः शोधलेल्या नंबरवर फोन करा.'], suspicious: ['सावध राहा', 'या मेसेजमधील काही भाग फसवणूक करणारे वापरतात. काहीही करण्याआधी दुसऱ्या मार्गाने तपासा.'], ok: ['कोणताही इशारा नाही', 'काहीही असामान्य आढळले नाही. तरीही PIN किंवा OTP कधीही सांगू नका.'] }
  }
};

const Q = {
  hi: {
    external_pressure: 'क्या कोई आप पर अभी यह भुगतान करने का दबाव डाल रहा है?',
    threat_reported: 'क्या किसी ने कहा है कि पैसे न देने पर गिरफ़्तारी, कानूनी कार्रवाई, खाता बंद होने या कोई और गंभीर नतीजा होगा?',
    secrecy_requested: 'क्या किसी ने आपसे यह भुगतान परिवार, दोस्तों या बैंक से छुपाने को कहा है?',
    continuous_call: 'क्या भुगतान करते समय कोई आपके साथ कॉल पर है, या आपको कदम-दर-कदम बता रहा है?',
    independent_verification: 'क्या आपने यह माँग खुद ढूँढे गए किसी आधिकारिक नंबर या वेबसाइट से जाँची है?'
  },
  mr: {
    external_pressure: 'आत्ता हे पेमेंट करण्यासाठी कोणी तुमच्यावर दबाव आणत आहे का?',
    threat_reported: 'पैसे न दिल्यास अटक, कायदेशीर कारवाई, खाते बंद होणे किंवा दुसरा गंभीर परिणाम होईल अशी धमकी कोणी दिली आहे का?',
    secrecy_requested: 'हे पेमेंट कुटुंब, मित्र किंवा बँकेपासून लपवून ठेवायला कोणी सांगितले आहे का?',
    continuous_call: 'पेमेंट करताना कोणी तुमच्यासोबत कॉलवर आहे का, किंवा टप्प्याटप्प्याने सांगत आहे का?',
    independent_verification: 'तुम्ही स्वतः शोधलेल्या अधिकृत नंबर किंवा वेबसाइटवरून ही मागणी तपासली आहे का?'
  }
};

// purpose id -> [button label, "you said it's", the fact]
const P = {
  hi: {
    family: ['दोस्त या परिवार'], shopping: ['खरीदारी या बिल'], rent: ['किराया, फ़ीस या सेवाएँ'], other: ['कुछ और'],
    govt: ['पुलिस, कोर्ट या सरकार', 'पुलिस, कोर्ट या सरकारी भुगतान', 'पुलिस, अदालतें और सरकारी विभाग कभी भी निजी खाते में पैसे नहीं लेते।'],
    bank: ['बैंक, KYC या SIM अपडेट', 'बैंक, KYC या SIM अपडेट', 'बैंक और टेलीकॉम कंपनियाँ KYC अपडेट या SIM चालू रखने के लिए पैसे ट्रांसफ़र करने को नहीं कहतीं।'],
    customs: ['कूरियर या कस्टम शुल्क', 'कूरियर या कस्टम शुल्क', 'कस्टम ड्यूटी सरकारी पोर्टल पर भरी जाती है, कभी किसी निजी खाते में नहीं।'],
    invest: ['निवेश या ट्रेडिंग', 'निवेश या ट्रेडिंग जमा', 'रजिस्टर्ड निवेश प्लेटफ़ॉर्म बिज़नेस खातों से पैसे लेते हैं, नए निजी खातों से नहीं।'],
    job: ['ऑनलाइन नौकरी या टास्क जमा', 'ऑनलाइन नौकरी या टास्क के लिए जमा', 'असली नियोक्ता काम शुरू करने या कमाई निकालने के लिए पैसे नहीं माँगते।'],
    _unconfirmed: 'हम पुष्टि नहीं कर सके कि यह खाता उसी संस्था का है जिसका आपने नाम लिया।'
  },
  mr: {
    family: ['मित्र किंवा कुटुंब'], shopping: ['खरेदी किंवा बिल'], rent: ['भाडे, फी किंवा सेवा'], other: ['दुसरे काही'],
    govt: ['पोलीस, कोर्ट किंवा सरकार', 'पोलीस, कोर्ट किंवा सरकारी पेमेंट', 'पोलीस, न्यायालये आणि सरकारी विभाग कधीही वैयक्तिक खात्यात पैसे घेत नाहीत.'],
    bank: ['बँक, KYC किंवा SIM अपडेट', 'बँक, KYC किंवा SIM अपडेट', 'बँका आणि टेलिकॉम कंपन्या KYC अपडेट किंवा SIM चालू ठेवण्यासाठी पैसे ट्रान्सफर करायला सांगत नाहीत.'],
    customs: ['कुरिअर किंवा कस्टम शुल्क', 'कुरिअर किंवा कस्टम शुल्क', 'कस्टम ड्युटी सरकारी पोर्टलवर भरली जाते, कधीही वैयक्तिक खात्यात नाही.'],
    invest: ['गुंतवणूक किंवा ट्रेडिंग', 'गुंतवणूक किंवा ट्रेडिंग डिपॉझिट', 'नोंदणीकृत गुंतवणूक प्लॅटफॉर्म व्यावसायिक खात्यातून पैसे घेतात, नवीन वैयक्तिक खात्यातून नाही.'],
    job: ['ऑनलाइन नोकरी किंवा टास्क डिपॉझिट', 'ऑनलाइन नोकरी किंवा टास्कसाठी डिपॉझिट', 'खरे नियोक्ते काम सुरू करण्यासाठी किंवा कमाई काढण्यासाठी पैसे मागत नाहीत.'],
    _unconfirmed: 'तुम्ही सांगितलेल्या संस्थेचेच हे खाते आहे याची आम्ही खात्री करू शकलो नाही.'
  }
};

const num = (s, i = 0) => (String(s || '').match(/\d+/g) || [])[i];
// reason code -> [label, detail(reason)]
const R = {
  hi: {
    new_beneficiary: ['नया प्राप्तकर्ता', () => 'इस खाते में आपका पहला भुगतान।'],
    amount_unusual: ['रकम सामान्य से बहुत ज़्यादा', (r) => (num(r.detail) ? `आपके सामान्य भुगतान से लगभग ${num(r.detail)} गुना।` : 'आपके सामान्य भुगतानों से बहुत ज़्यादा।')],
    rapid_transactions: ['कम समय में कई भुगतान', () => 'कुछ ही मिनटों में कई भुगतान।'],
    unusual_hour: ['असामान्य समय (रात 11 से सुबह 5)', () => 'देर रात भुगतान करना आपके लिए असामान्य है।'],
    active_call: ['कॉल चल रही है', (r) => (/real phone call/.test(r.detail) ? 'इस फ़ोन पर अभी असली कॉल चल रही है।' : /internet call/.test(r.detail) ? 'इस फ़ोन पर अभी इंटरनेट कॉल (WhatsApp जैसी) चल रही है।' : 'आप अज्ञात नंबर की कॉल पर रहते हुए भुगतान कर रहे हैं।')],
    screen_shared: ['स्क्रीन शेयर हो रही है', () => 'कोई दूसरी स्क्रीन या स्क्रीन-शेयरिंग ऐप यह फ़ोन देख सकता है।'],
    link_from_message: ['मैसेज के लिंक से खोला गया भुगतान', (r) => { const f = (r.detail.match(/from (.+?), not/) || [])[1]; return `यह भुगतान ${f ? `${f} के ` : ''}मैसेज में आए लिंक से खुला, आपने खुद नहीं लिखा।`; }],
    external_pressure: ['अभी भुगतान करने का दबाव', () => 'आपने बताया कि कोई आप पर दबाव डाल रहा है।'],
    threat_reported: ['गिरफ़्तारी या जुर्माने की धमकी', () => 'आपने बताया कि किसी ने गंभीर नतीजे की धमकी दी।'],
    secrecy_requested: ['बात छुपाने को कहा गया', () => 'आपसे कहा गया कि यह भुगतान किसी को न बताएँ।'],
    continuous_call: ['कॉल पर कोई निर्देश दे रहा है', () => 'भुगतान के दौरान कोई आपको कदम-दर-कदम बता रहा है।'],
    claim_vs_account: ['बताया गया कारण खाते से मेल नहीं खाता', null],
    claim_unconfirmed: ['संस्था का नाम लिया, खाता पुष्ट नहीं', null],
    mule_pattern: ['नया खाता, बहुत से लोगों ने पैसे भेजे', (r) => `${num(r.detail)} दिन पहले खुला, आज ${num(r.detail, 1)} अलग-अलग लोगों ने पैसे भेजे।`],
    reported_payee: ['दूसरे लोगों ने इस खाते की शिकायत की है', () => 'दूसरे यूज़र्स ने इस खाते के बारे में शिकायत की है।'],
    linked_to_reported: ['शिकायत वाले खाते से जुड़ा खाता', () => 'यह खाता उसी डिवाइस या फ़ोन नंबर से जुड़ा है जिस पर धोखाधड़ी की शिकायत है।'],
    script_words: ['नोट में ठगों वाले शब्द', () => 'नोट में धोखाधड़ी की स्क्रिप्ट में आने वाले शब्द हैं।']
  },
  mr: {
    new_beneficiary: ['नवीन प्राप्तकर्ता', () => 'या खात्यात तुमचे पहिले पेमेंट.'],
    amount_unusual: ['रक्कम नेहमीपेक्षा खूप जास्त', (r) => (num(r.detail) ? `तुमच्या नेहमीच्या पेमेंटच्या सुमारे ${num(r.detail)} पट.` : 'तुमच्या नेहमीच्या पेमेंटपेक्षा खूप जास्त.')],
    rapid_transactions: ['थोड्या वेळात अनेक पेमेंट', () => 'काही मिनिटांत अनेक पेमेंट.'],
    unusual_hour: ['असामान्य वेळ (रात्री 11 ते पहाटे 5)', () => 'रात्री उशिरा पेमेंट करणे तुमच्यासाठी असामान्य आहे.'],
    active_call: ['कॉल सुरू आहे', (r) => (/real phone call/.test(r.detail) ? 'या फोनवर आत्ता खरा कॉल सुरू आहे.' : /internet call/.test(r.detail) ? 'या फोनवर आत्ता इंटरनेट कॉल (WhatsApp सारखा) सुरू आहे.' : 'अनोळखी नंबरच्या कॉलवर असताना तुम्ही पेमेंट करत आहात.')],
    screen_shared: ['स्क्रीन शेअर होत आहे', () => 'दुसरी स्क्रीन किंवा स्क्रीन-शेअरिंग अ‍ॅप हा फोन पाहू शकतो.'],
    link_from_message: ['मेसेजमधील लिंकवरून उघडलेले पेमेंट', (r) => { const f = (r.detail.match(/from (.+?), not/) || [])[1]; return `हे पेमेंट ${f ? `${f} च्या ` : ''}मेसेजमधील लिंकवरून उघडले, तुम्ही स्वतः टाइप केले नाही.`; }],
    external_pressure: ['आत्ताच पैसे भरण्याचा दबाव', () => 'कोणी दबाव आणत आहे असे तुम्ही सांगितले.'],
    threat_reported: ['अटक किंवा दंडाची धमकी', () => 'कोणी गंभीर परिणामांची धमकी दिली असे तुम्ही सांगितले.'],
    secrecy_requested: ['गुप्त ठेवायला सांगितले', () => 'हे पेमेंट कोणालाही सांगू नका असे तुम्हाला सांगितले गेले.'],
    continuous_call: ['कॉलवर कोणी सूचना देत आहे', () => 'पेमेंट करताना कोणी तुम्हाला टप्प्याटप्प्याने सांगत आहे.'],
    claim_vs_account: ['सांगितलेले कारण खात्याशी जुळत नाही', null],
    claim_unconfirmed: ['संस्थेचे नाव घेतले, खाते निश्चित नाही', null],
    mule_pattern: ['नवीन खाते, अनेक लोकांनी पैसे पाठवले', (r) => `${num(r.detail)} दिवसांपूर्वी उघडले, आज ${num(r.detail, 1)} वेगवेगळ्या लोकांनी पैसे पाठवले.`],
    reported_payee: ['इतर लोकांनी या खात्याची तक्रार केली आहे', () => 'इतर वापरकर्त्यांनी या खात्याबद्दल तक्रार केली आहे.'],
    linked_to_reported: ['तक्रार असलेल्या खात्याशी जोडलेले खाते', () => 'हे खाते फसवणुकीची तक्रार असलेल्या खात्याच्या डिव्हाइस किंवा फोन नंबरशी जोडलेले आहे.'],
    script_words: ['नोटमध्ये फसवणुकीचे शब्द', () => 'नोटमध्ये फसवणूक करणाऱ्यांच्या स्क्रिप्टमधील शब्द आहेत.']
  }
};

const FLAGS = {
  hi: { fake_sender: 'भेजने वाले का ID बैंक या सरकारी विभाग की नकल करता है', pay_request: 'लिंक या UPI ID से भुगतान माँगता है', lookalike: 'लिंक बैंक या सरकारी साइट की नकल है', link: 'इसमें भुगतान वाला लिंक है', threat: 'गिरफ़्तारी, ब्लॉक या जुर्माने की धमकी', urgency: 'जल्दबाज़ी करवाता है', secrecy: 'बात छुपाने को कहता है', too_good: 'इनाम या पक्का मुनाफ़ा', personal_sender: 'निजी मोबाइल नंबर से भेजा गया', new_account: 'पैसे पाने वाला खाता कुछ ही दिन पुराना है', reported: 'पैसे पाने वाला खाता धोखाधड़ी की शिकायतों से जुड़ा है', script: 'ठगों की स्क्रिप्ट वाले शब्द' },
  mr: { fake_sender: 'पाठवणाऱ्याचा ID बँक किंवा सरकारी विभागाची नक्कल करतो', pay_request: 'लिंक किंवा UPI ID ने पेमेंट मागतो', lookalike: 'लिंक बँक किंवा सरकारी साइटची नक्कल आहे', link: 'यात पेमेंटची लिंक आहे', threat: 'अटक, ब्लॉक किंवा दंडाची धमकी', urgency: 'घाई करायला लावतो', secrecy: 'गुप्त ठेवायला सांगतो', too_good: 'बक्षीस किंवा खात्रीशीर नफा', personal_sender: 'वैयक्तिक मोबाइल नंबरवरून पाठवला', new_account: 'पैसे घेणारे खाते काही दिवसांचेच आहे', reported: 'पैसे घेणारे खाते फसवणुकीच्या तक्रारींशी जोडलेले आहे', script: 'फसवणुकीच्या स्क्रिप्टमधील शब्द' }
};

const pick = (lang) => (S[lang] ? lang : 'en');
/** All strings for a language. */
export const tr = (lang) => S[pick(lang)];
export const langOf = (user) => pick(user?.settings?.lang);
// Lazy import keeps this file free of app state, so tests and the relay can use it.
export const setLang = (user, lang) => { if (user?.id) import('./store.js').then((m) => m.updateSettings(user.id, { lang: pick(lang) })); };

export function questionText(lang, q) { return Q[lang]?.[q.id] || q.q; }
export function purposeLabel(lang, p) { return P[lang]?.[p.id]?.[0] || p.label; }

/** Translated label and detail for one reason from the engine. */
export function reasonText(lang, r, purpose) {
  const t = R[lang]?.[r.code];
  if (!t) return { label: r.label, detail: r.detail };
  let detail = t[1] ? t[1](r) : r.detail;
  if (r.code === 'claim_vs_account') detail = P[lang]?.[purpose]?.[2] || r.detail;
  if (r.code === 'claim_unconfirmed') detail = P[lang]._unconfirmed;
  return { label: t[0], detail };
}

/** Translated story-vs-facts lines. */
export function svfText(lang, svf, purpose) {
  if (!svf || lang === 'en' || !P[lang]) return svf;
  const p = P[lang][purpose];
  return { ...svf, said: p?.[1] || svf.said, fact: svf.kind === 'unconfirmed' ? P[lang]._unconfirmed : p?.[2] || svf.fact };
}

export function flagLabel(lang, f) { return FLAGS[lang]?.[f.code] || f.label; }
