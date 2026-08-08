// Fabricated, UNCLASSIFIED demonstration corpus. All names, handles, numbers,
// and locations are fictional. Three threads exercise the rendering paths the
// prototype must prove: Arabic RTL mixed with English, Farsi RTL, and CJK,
// plus an image attachment for the OCR viewer.

// contentType reflects the ingest lane a linguist triages: chat 'message' is
// the evaluated chat-viewer requirement; 'transcript' (speaker-turn audio cuts)
// and 'document' (OCR'd files) share the same reading surface and enrichment
// seam, so the triage panel is container-agnostic by design.
const threads = [
  {
    threadId: 't-1001',
    title: 'Harbor Freight Coordination',
    network: 'GreenWire',
    contentType: 'message',
    languages: ['ar', 'en'],
    participants: 3,
    lastActivity: '2026-06-30T09:41:07Z',
    messageCount: 9
  },
  {
    threadId: 't-1002',
    title: 'Caravan Route Update',
    network: 'PamirChat',
    contentType: 'message',
    languages: ['fa', 'en'],
    participants: 2,
    lastActivity: '2026-06-29T18:22:45Z',
    messageCount: 6
  },
  {
    threadId: 't-1003',
    title: 'Warehouse Manifest Review',
    network: 'LotusLink',
    contentType: 'message',
    languages: ['zh', 'en'],
    participants: 2,
    lastActivity: '2026-06-28T13:05:12Z',
    messageCount: 6
  },
  // Curated multi-page document: a true paged file (3-page Russian storage
  // contract) so the OCR viewer's page navigation and long-document reading
  // path are demonstrated, not just single-image scans.
  {
    threadId: 't-1004',
    title: 'Storage Contract (Novorossiysk)',
    network: 'DOCEX',
    contentType: 'document',
    languages: ['ru', 'en'],
    participants: 1,
    lastActivity: '2026-07-12T09:00:00Z',
    messageCount: 1
  },
  {
    threadId: 't-1005',
    title: 'Customs File — Misrata Declaration JM-0418',
    network: 'DOCEX',
    contentType: 'document',
    languages: ['ar', 'en'],
    participants: 1,
    lastActivity: '2026-07-03T11:20:00Z',
    messageCount: 1
  }
];

const messages = {
  't-1001': [
    { messageId: 'm-1', ts: '2026-06-30T08:14:22Z', sender: { handle: 'saqr_92', network: 'GreenWire' }, lang: 'ar', dir: 'rtl',
      text: 'وصلت الشحنة إلى الميناء صباح اليوم. التاجر أبو كريم سيستلمها بنفسه.' },
    { messageId: 'm-2', ts: '2026-06-30T08:16:03Z', sender: { handle: 'saqr_92', network: 'GreenWire' }, lang: 'ar', dir: 'rtl',
      text: 'التسليم في مستودع طرابلس القديم قرب البوابة الشرقية.' },
    { messageId: 'm-3', ts: '2026-06-30T08:19:47Z', sender: { handle: 'harbor_ops', network: 'GreenWire' }, lang: 'en', dir: 'ltr',
      text: 'Confirmed. Abu Karim will call the broker at +218 91 555 0142 before noon.' },
    { messageId: 'm-4', ts: '2026-06-30T08:24:10Z', sender: { handle: 'saqr_92', network: 'GreenWire' }, lang: 'ar', dir: 'rtl',
      text: 'جيد. أخبر السائق أن يتجنب طريق الساحل، هناك تفتيش عند جسر الغزالة.' },
    { messageId: 'm-5', ts: '2026-06-30T08:31:55Z', sender: { handle: 'harbor_ops', network: 'GreenWire' }, lang: 'en', dir: 'ltr',
      text: 'Understood. Rerouting through Qasr Road. ETA to the warehouse is 14:30 local.' },
    { messageId: 'm-6', ts: '2026-06-30T08:40:12Z', sender: { handle: 'saqr_92', network: 'GreenWire' }, lang: 'ar', dir: 'rtl',
      text: 'أرسل لي صورة بوليصة الشحن عندما تصل.' },
    { messageId: 'm-7', ts: '2026-06-30T09:22:38Z', sender: { handle: 'harbor_ops', network: 'GreenWire' }, lang: 'en', dir: 'ltr',
      text: 'Photo of the bill of lading attached.',
      attachments: [ { attachmentId: 'a-7001', type: 'image', name: 'bill_of_lading.png', uri: '/static/attachments/a-7001.png' } ] },
    { messageId: 'm-8', ts: '2026-06-30T09:35:04Z', sender: { handle: 'saqr_92', network: 'GreenWire' }, lang: 'ar', dir: 'rtl',
      text: 'استلمتها. سيتم الدفع عن طريق مكتب الصرافة في شارع عمر المختار.' },
    { messageId: 'm-9', ts: '2026-06-30T09:41:07Z', sender: { handle: 'harbor_ops', network: 'GreenWire' }, lang: 'en', dir: 'ltr',
      text: 'Copy. Closing this channel until Thursday.' }
  ],
  't-1002': [
    { messageId: 'm-10', ts: '2026-06-29T17:02:11Z', sender: { handle: 'kuhestan', network: 'PamirChat' }, lang: 'fa', dir: 'rtl',
      text: 'کاروان فردا صبح از مشهد حرکت می‌کند. راننده جدید است، اسمش رضا توکلی.' },
    { messageId: 'm-11', ts: '2026-06-29T17:05:29Z', sender: { handle: 'trade_rt', network: 'PamirChat' }, lang: 'en', dir: 'ltr',
      text: 'Noted. Does Reza have the transit papers for the Dogharoun crossing?' },
    { messageId: 'm-12', ts: '2026-06-29T17:09:44Z', sender: { handle: 'kuhestan', network: 'PamirChat' }, lang: 'fa', dir: 'rtl',
      text: 'بله، مدارک کامل است. شماره تماس او ۰۹۱۵۵۵۰۱۸۷ است.' },
    { messageId: 'm-13', ts: '2026-06-29T17:15:02Z', sender: { handle: 'trade_rt', network: 'PamirChat' }, lang: 'en', dir: 'ltr',
      text: 'Good. Payment clears through the Herat office once the trucks pass Islam Qala.' },
    { messageId: 'm-14', ts: '2026-06-29T18:01:36Z', sender: { handle: 'kuhestan', network: 'PamirChat' }, lang: 'fa', dir: 'rtl',
      text: 'کرایه انبار در هرات دو برابر شده. باید با حاجی محمود صحبت کنی.' },
    { messageId: 'm-15', ts: '2026-06-29T18:22:45Z', sender: { handle: 'trade_rt', network: 'PamirChat' }, lang: 'en', dir: 'ltr',
      text: 'I will raise it with Haji Mahmoud on Friday.' }
  ],
  't-1003': [
    { messageId: 'm-16', ts: '2026-06-28T12:10:09Z', sender: { handle: 'lianhua88', network: 'LotusLink' }, lang: 'zh', dir: 'ltr',
      text: '仓库清单已经更新。新的一批货物明天从广州发出。' },
    { messageId: 'm-17', ts: '2026-06-28T12:14:31Z', sender: { handle: 'depot_mgr', network: 'LotusLink' }, lang: 'en', dir: 'ltr',
      text: 'Received. Who signs for the Guangzhou shipment on arrival?' },
    { messageId: 'm-18', ts: '2026-06-28T12:20:55Z', sender: { handle: 'lianhua88', network: 'LotusLink' }, lang: 'zh', dir: 'ltr',
      text: '陈伟明会在码头签收。他的电话是 +86 138 5555 0199。' },
    { messageId: 'm-19', ts: '2026-06-28T12:31:20Z', sender: { handle: 'depot_mgr', network: 'LotusLink' }, lang: 'en', dir: 'ltr',
      text: 'Understood. Storage fees settle through the Shenzhen account as before.' },
    { messageId: 'm-20', ts: '2026-06-28T12:58:44Z', sender: { handle: 'lianhua88', network: 'LotusLink' }, lang: 'zh', dir: 'ltr',
      text: '好的。下周我们在香港见面讨论第四季度的安排。' },
    { messageId: 'm-21', ts: '2026-06-28T13:05:12Z', sender: { handle: 'depot_mgr', network: 'LotusLink' }, lang: 'en', dir: 'ltr',
      text: 'Confirmed for Hong Kong. Safe travels.' }
  ],
  't-1004': [
    { messageId: 'm-22', ts: '2026-07-12T09:00:00Z', sender: { handle: 'document body', network: 'DOCEX' }, lang: 'ru', dir: 'ltr',
      text: 'ДОГОВОР ХРАНЕНИЯ № СК-2026-0712-09  ·  г. Новороссийск  ·  ООО «Волга-Транзит» / контора Ростов  ·  30 ящиков, склад № 4, причал 7',
      attachments: [ { attachmentId: 'a-7002', type: 'image', name: 'dogovor_hranenija.pdf', uri: '/static/attachments/a-7002-p1.png' } ] }
  ],
  't-1005': [
    { messageId: 'm-23', ts: '2026-07-03T11:20:00Z', sender: { handle: 'document body', network: 'DOCEX' }, lang: 'ar', dir: 'rtl',
      text: 'إقرار جمركي للوارد رقم JM-2026-0703-0418  ·  ميناء مصراتة  ·  السفينة نجمة سرت، رحلة NS-114  ·  ٤٢ طرد / ٦٣٠٠ كغم  ·  أُفرج عن الشحنة',
      attachments: [ { attachmentId: 'a-7003', type: 'image', name: 'iqrar_jumruki_JM-0418.pdf', uri: '/static/attachments/a-7003-p1.png' } ] }
  ]
};

// Enrichment fixtures, keyed by messageId. In production these responses come
// from the live enrichment services; the schemas below are the pinned contract.
const translations = {
  'm-1': 'The shipment arrived at the port this morning. The merchant Abu Karim will receive it himself.',
  'm-2': 'Delivery is at the old Tripoli warehouse near the eastern gate.',
  'm-4': 'Good. Tell the driver to avoid the coastal road, there is an inspection at the Ghazala bridge.',
  'm-6': 'Send me a photo of the bill of lading when it arrives.',
  'm-8': 'I received it. Payment will be made through the currency exchange office on Omar Al-Mukhtar Street.',
  'm-10': 'The caravan departs Mashhad tomorrow morning. The driver is new, his name is Reza Tavakoli.',
  'm-12': 'Yes, the documents are complete. His contact number is 0915 555 0187.',
  'm-14': 'Warehouse rent in Herat has doubled. You need to speak with Haji Mahmoud.',
  'm-16': 'The warehouse manifest has been updated. The new batch of goods ships from Guangzhou tomorrow.',
  'm-18': 'Chen Weiming will sign at the dock. His phone is +86 138 5555 0199.',
  'm-20': 'OK. Next week we meet in Hong Kong to discuss the fourth-quarter arrangements.',
  'm-22': 'Storage Contract No. SK-2026-0712-09 — Novorossiysk. Volga-Tranzit LLC / the Rostov office. 30 crates, Warehouse No. 4, Pier 7.',
  'm-23': 'Import customs declaration No. JM-2026-0703-0418 — Port of Misrata. Vessel Najmat Sirte, voyage NS-114. 42 packages / 6,300 kg. Shipment released.'
};

const entities = {
  'm-1': [ { type: 'person', text: 'Abu Karim', confidence: 0.94 } ],
  'm-2': [ { type: 'geo', text: 'Tripoli warehouse (eastern gate)', confidence: 0.9 } ],
  'm-3': [ { type: 'person', text: 'Abu Karim', confidence: 0.96 }, { type: 'phone', text: '+218 91 555 0142', confidence: 0.99 } ],
  'm-4': [ { type: 'geo', text: 'Ghazala bridge (coastal road)', confidence: 0.88 } ],
  'm-5': [ { type: 'geo', text: 'Qasr Road', confidence: 0.87 } ],
  'm-8': [ { type: 'geo', text: 'Omar Al-Mukhtar Street', confidence: 0.9 } ],
  'm-10': [ { type: 'person', text: 'Reza Tavakoli', confidence: 0.95 }, { type: 'geo', text: 'Mashhad', confidence: 0.97 } ],
  'm-11': [ { type: 'person', text: 'Reza', confidence: 0.83 }, { type: 'geo', text: 'Dogharoun crossing', confidence: 0.91 } ],
  'm-12': [ { type: 'phone', text: '0915 555 0187', confidence: 0.98 } ],
  'm-13': [ { type: 'geo', text: 'Herat', confidence: 0.96 }, { type: 'geo', text: 'Islam Qala', confidence: 0.93 } ],
  'm-14': [ { type: 'person', text: 'Haji Mahmoud', confidence: 0.92 }, { type: 'geo', text: 'Herat', confidence: 0.96 } ],
  'm-15': [ { type: 'person', text: 'Haji Mahmoud', confidence: 0.94 } ],
  'm-16': [ { type: 'geo', text: 'Guangzhou', confidence: 0.97 } ],
  'm-18': [ { type: 'person', text: 'Chen Weiming', confidence: 0.95 }, { type: 'phone', text: '+86 138 5555 0199', confidence: 0.99 } ],
  'm-19': [ { type: 'geo', text: 'Shenzhen', confidence: 0.95 } ],
  'm-20': [ { type: 'geo', text: 'Hong Kong', confidence: 0.98 } ],
  'm-21': [ { type: 'geo', text: 'Hong Kong', confidence: 0.98 } ],
  'm-22': [
    { type: 'geo', text: 'Novorossiysk', confidence: 0.96 },
    { type: 'person', text: 'Sergei Volkov', confidence: 0.93 },
    { type: 'phone', text: '+7 903 555 0147', confidence: 0.98 }
  ],
  'm-23': [
    { type: 'geo', text: 'Misrata', confidence: 0.97 },
    { type: 'geo', text: 'Tripoli', confidence: 0.95 },
    { type: 'person', text: 'A. Al-Zarrouq', confidence: 0.91 },
    { type: 'selector', text: 'JM-2026-0703-0418', confidence: 0.99 },
    { type: 'selector', text: 'GW-2026-0630-114', confidence: 0.98 }
  ]
};

const summaries = {
  't-1001': 'Participants coordinate receipt of a shipment that arrived at a Libyan port. "Abu Karim" will take delivery personally at the old Tripoli warehouse near the eastern gate; a broker will be contacted at +218 91 555 0142. The driver is rerouted from the coastal road to Qasr Road to avoid an inspection at the Ghazala bridge (ETA 14:30 local). A bill-of-lading photo is exchanged and payment is arranged through a currency-exchange office on Omar Al-Mukhtar Street.',
  't-1002': 'Participants plan a caravan departing Mashhad with a new driver, Reza Tavakoli (0915 555 0187), transiting the Dogharoun crossing toward Islam Qala. Payment clears through a Herat office once trucks pass the border. Doubled warehouse rent in Herat is to be raised with "Haji Mahmoud" on Friday.',
  't-1003': 'Participants review an updated warehouse manifest for a shipment leaving Guangzhou. Chen Weiming (+86 138 5555 0199) signs at the dock; storage fees settle through a Shenzhen account. A Q4-planning meeting is set for the following week in Hong Kong.',
  't-1004': 'Three-page Russian storage contract (No. SK-2026-0712-09, Novorossiysk, 12 Jul 2026): Volga-Tranzit LLC (S. Volkov, +7 903 555 0147) stores 30 crates of "spare parts" (B-101–B-130, 6,300 kg) for the Rostov office at Warehouse No. 4, Pier 7, until 30 Sep 2026 at 48,000 rub/month; warehouse access restricted to an agreed list; crates may not be opened; release on 24-hour written notice. Signed Volkov / Orlov.'
};

const ocr = {
  // Multi-page document: `pages` carries per-page images and blocks (additive
  // to the pinned contract — flat `blocks`/`fullText` remain for consumers
  // that read the document as one stream).
  'a-7002': {
    attachmentId: 'a-7002',
    engine: 'mock-ocr',
    schemaVersion: '1.0',
    srcLang: 'ru',
    englishGloss: 'Storage Contract No. SK-2026-0712-09 — Novorossiysk, 12 July 2026. Custodian: Volga-Tranzit LLC (S. Volkov); depositor: the Rostov office (D. Orlov). Subject: storage of 30 crates of spare parts (marked B-101–B-130, 6,300 kg) at Warehouse No. 4, Pier 7, Port of Novorossiysk, until 30 September 2026 at 48,000 rub/month. Contact: S. Volkov, +7 903 555 0147. Special terms: warehouse access by agreed list only; crates may not be opened; release on 24-hour written request. Signed Volkov / Orlov, company stamp.',
    pages: [
      { page: 1, uri: '/static/attachments/a-7002-p1.png', blocks: [
        { text: 'ДОГОВОР ХРАНЕНИЯ № СК-2026-0712-09', bbox: [40, 40, 340, 76] },
        { text: 'г. Новороссийск · 12 июля 2026 г.', bbox: [40, 108, 340, 126] },
        { text: 'Хранитель: ООО «Волга-Транзит», в лице С. Волкова', bbox: [40, 172, 340, 212] },
        { text: 'Поклажедатель: контора Ростов, в лице Д. Орлова', bbox: [40, 226, 340, 266] },
        { text: 'Предмет: хранение 30 (тридцати) ящиков, запасные части, маркировка В-101 – В-130', bbox: [40, 284, 340, 374] },
        { text: 'Место хранения: склад № 4, причал 7, порт Новороссийск', bbox: [40, 392, 340, 432] }
      ] },
      { page: 2, uri: '/static/attachments/a-7002-p2.png', blocks: [
        { text: 'УСЛОВИЯ ХРАНЕНИЯ И ОПЛАТЫ', bbox: [40, 38, 340, 58] },
        { text: '2.1. Срок хранения: до 30 сентября 2026 г.', bbox: [40, 88, 340, 128] },
        { text: '2.2. Плата за хранение: 48 000 руб. в месяц, оплата до 5 числа месяца', bbox: [40, 146, 340, 208] },
        { text: '2.3. Контактное лицо хранителя: С. Волков, тел. +7 903 555 0147', bbox: [40, 226, 340, 266] },
        { text: '2.4. Особые условия: доступ на склад — только по списку, согласованному сторонами; вскрытие ящиков не допускается', bbox: [40, 284, 340, 368] },
        { text: '2.5. Выдача груза — по письменной заявке за 24 часа', bbox: [40, 386, 340, 426] }
      ] },
      { page: 3, uri: '/static/attachments/a-7002-p3.png', blocks: [
        { text: 'ПРИЛОЖЕНИЕ А — ОПИСЬ ГРУЗА', bbox: [40, 38, 340, 58] },
        { text: 'Ящики: В-101 – В-130 (30 шт.)', bbox: [40, 88, 340, 106] },
        { text: 'Содержимое: запасные части', bbox: [40, 122, 340, 140] },
        { text: 'Общий вес: 6 300 кг', bbox: [40, 156, 340, 174] },
        { text: 'Состояние упаковки: без повреждений', bbox: [40, 190, 340, 208] },
        { text: 'Подписи: С. Волков / Д. Орлов', bbox: [40, 266, 340, 370] },
        { text: '[печать: ООО «ВОЛГА-ТРАНЗИТ»]', bbox: [230, 390, 340, 450] }
      ] }
    ],
    get blocks() { return this.pages.flatMap(p => p.blocks); },
    get fullText() { return this.pages.flatMap(p => p.blocks.map(b => b.text)).join('\n'); }
  },
  // Curated 5-page Arabic customs file. The corpus had no dense document — the
  // largest was 19 short blocks across 3 pages — so nothing exercised paging,
  // zoom, or reading a real form at length. This one is RTL, tabular, stamped
  // and signed, which is what an officer actually receives.
  'a-7003': {
    attachmentId: 'a-7003',
    engine: 'mock-ocr',
    schemaVersion: '1.0',
    srcLang: 'ar',
    englishGloss: 'Import customs declaration No. JM-2026-0703-0418, General Authority of Customs, Port of Misrata (inbound section), form J-14, dated 3 July 2026. Exporter: Al-Karim Trading Company; importer: Al-Nakheel Import Establishment. Vessel Najmat Sirte, voyage NS-114, bill of lading GW-2026-0630-114, loading port Misrata, discharge port Tripoli. 42 packages, 6,300 kg of machinery spare parts, itemised across 14 lines — diesel engine parts, hydraulic pumps, high-pressure valves, gaskets and seals, oil and fuel filters, drive belts, axle bearings, insulated electrical cable, electronic control panels, lead-acid batteries, size-1200 truck tyres, drums of lubricating oil, hand tools, and body panels. No hazardous materials; packages 11 and 12 require shaded storage. Declared value 482,000 LYD; duty at 5% 24,100; VAT 19,280; handling and discharge 6,750; port services 2,400; total due 554,530 LYD, paid in full by bank transfer through Bank of Unity, Misrata branch, receipt RC-2026-0703-2291. Inspection record INS-2026-0703-77: cargo fully examined 3 July 2026 in yard 7 at the port of Misrata with the importer\'s representative and the shipping agent present; found to match the declaration with no discrepancy in count or weight; package 11 shows surface damage to the outer wrapping with no effect on contents. Inspector A. Al-Zarrouq, staff number MC-4471; clearing agent White Sea Clearance Company. Annotated "shipment released"; customs release stamp dated 3 July 2026.',
    pages: [
      { page: 1, uri: '/static/attachments/a-7003-p1.png', blocks: [
        { text: 'الهيئة العامة للجمارك — ميناء مصراتة، قسم الوارد', bbox: [40, 36, 360, 66] },
        { text: 'إقرار جمركي للوارد — نموذج ج-١٤ / بيان تفصيلي', bbox: [40, 86, 360, 122] },
        { text: 'رقم الإقرار: JM-2026-0703-0418', bbox: [40, 150, 360, 170] },
        { text: 'التاريخ: ٣ يوليو ٢٠٢٦', bbox: [40, 177, 360, 197] },
        { text: 'المصدّر: شركة الكريم للتجارة', bbox: [40, 204, 360, 224] },
        { text: 'المستورد: مؤسسة النخيل للاستيراد', bbox: [40, 231, 360, 251] },
        { text: 'السفينة: نجمة سرت', bbox: [40, 258, 360, 278] },
        { text: 'رقم الرحلة: NS-114', bbox: [40, 285, 360, 305] },
        { text: 'بوليصة الشحن: GW-2026-0630-114', bbox: [40, 312, 360, 332] },
        { text: 'ميناء الشحن: مصراتة', bbox: [40, 339, 360, 359] },
        { text: 'ميناء التفريغ: طرابلس', bbox: [40, 366, 360, 386] },
        { text: 'عدد الطرود: ٤٢ طرد', bbox: [40, 393, 360, 413] },
        { text: 'الوزن الإجمالي: ٦٣٠٠ كغم', bbox: [40, 420, 360, 440] },
        { text: 'نوع البضاعة: قطع غيار آليات', bbox: [40, 447, 360, 467] },
        { text: '[ختم: جمارك مصراتة — 03-07-2026]', bbox: [246, 471, 354, 529] }
      ] },
      { page: 2, uri: '/static/attachments/a-7003-p2.png', blocks: [
        { text: 'بيان تفصيلي بالبضاعة — الطرود ١ – ٨', bbox: [40, 86, 360, 122] },
        { text: 'وصف البضاعة | الكمية | الوزن (كغم)', bbox: [40, 147, 360, 166] },
        { text: '١ — محركات ديزل، قطع غيار | ٦ | ٩٤٠', bbox: [40, 174, 360, 194] },
        { text: '٢ — مضخات هيدروليكية | ٤ | ٣١٠', bbox: [40, 200, 360, 220] },
        { text: '٣ — صمامات ضغط عالٍ | ١٢ | ١٨٥', bbox: [40, 226, 360, 246] },
        { text: '٤ — أطقم حشوات ومانعات تسرب | ٨ | ٦٢', bbox: [40, 252, 360, 272] },
        { text: '٥ — مرشحات زيت ووقود | ١٤ | ١٤٨', bbox: [40, 278, 360, 298] },
        { text: '٦ — أحزمة نقل الحركة | ٩ | ٧٦', bbox: [40, 304, 360, 324] },
        { text: '٧ — مساند محاور | ٥ | ٢٤٠', bbox: [40, 330, 360, 350] },
        { text: '٨ — كابلات كهربائية معزولة | ٣ | ٤١٠', bbox: [40, 356, 360, 376] },
        { text: 'يتبع في الصفحة التالية', bbox: [40, 390, 360, 410] }
      ] },
      { page: 3, uri: '/static/attachments/a-7003-p3.png', blocks: [
        { text: 'بيان تفصيلي — تتمة | الطرود ٩ – ١٤ والإجمالي', bbox: [40, 86, 360, 122] },
        { text: '٩ — لوحات تحكم إلكترونية | ٢ | ٥٥', bbox: [40, 174, 360, 194] },
        { text: '١٠ — بطاريات رصاصية | ٦ | ٣٩٠', bbox: [40, 200, 360, 220] },
        { text: '١١ — إطارات شاحنات مقاس ١٢٠٠ | ٤ | ٦٨٠', bbox: [40, 226, 360, 246] },
        { text: '١٢ — زيوت تشحيم، براميل | ٣ | ٦٠٠', bbox: [40, 252, 360, 272] },
        { text: '١٣ — أدوات ورشة يدوية | ٧ | ١٣٤', bbox: [40, 278, 360, 298] },
        { text: '١٤ — قطع هيكل خارجي | ٥ | ٥٢٠', bbox: [40, 304, 360, 324] },
        { text: 'الإجمالي: ٤٢ طرد | ٦٣٠٠ كغم', bbox: [40, 340, 360, 360] },
        { text: 'ملاحظات: لا توجد مواد خطرة ضمن الشحنة.', bbox: [40, 372, 360, 400] },
        { text: 'الطرود ١١ و١٢ تستوجب تخزيناً مظللاً.', bbox: [40, 400, 360, 420] }
      ] },
      { page: 4, uri: '/static/attachments/a-7003-p4.png', blocks: [
        { text: 'الرسوم والضرائب المستحقة — كشف حساب RC-2026-0703-2291', bbox: [40, 86, 360, 122] },
        { text: 'القيمة المصرح بها: ٤٨٢٬٠٠٠ د.ل', bbox: [40, 160, 360, 180] },
        { text: 'رسم جمركي (٥٪): ٢٤٬١٠٠ د.ل', bbox: [40, 192, 360, 212] },
        { text: 'ضريبة القيمة المضافة: ١٩٬٢٨٠ د.ل', bbox: [40, 224, 360, 244] },
        { text: 'رسوم المناولة والتفريغ: ٦٬٧٥٠ د.ل', bbox: [40, 256, 360, 276] },
        { text: 'رسم الخدمات الميناء: ٢٬٤٠٠ د.ل', bbox: [40, 288, 360, 308] },
        { text: 'الإجمالي المستحق: ٥٥٤٬٥٣٠ د.ل', bbox: [40, 332, 360, 358] },
        { text: 'رقم الإيصال: RC-2026-0703-2291', bbox: [40, 390, 360, 410] },
        { text: 'طريقة الدفع: حوالة مصرفية', bbox: [40, 418, 360, 438] },
        { text: 'المصرف: مصرف الوحدة — فرع مصراتة', bbox: [40, 446, 360, 466] },
        { text: 'حالة السداد: مسدّد بالكامل', bbox: [40, 486, 360, 506] }
      ] },
      { page: 5, uri: '/static/attachments/a-7003-p5.png', blocks: [
        { text: 'تقرير التفتيش والإفراج — محضر معاينة رقم INS-2026-0703-77', bbox: [40, 86, 360, 122] },
        { text: 'تم فحص الشحنة بالكامل بتاريخ ٣ يوليو ٢٠٢٦ في الساحة رقم ٧ بميناء مصراتة، بحضور ممثل المستورد ووكيل الشحن.', bbox: [40, 146, 360, 214] },
        { text: 'نتيجة الفحص: مطابقة للبيان — لا توجد فروقات في العدد أو الوزن. الطرد رقم ١١ به تلف سطحي في الغلاف الخارجي دون أثر على المحتوى.', bbox: [40, 234, 360, 322] },
        { text: 'المفتش: ع. الزروق', bbox: [40, 342, 360, 362] },
        { text: 'الرقم الوظيفي: MC-4471', bbox: [40, 370, 360, 390] },
        { text: 'وكيل الشحن: شركة البحر الأبيض للتخليص', bbox: [40, 398, 360, 418] },
        { text: '[بخط اليد: أُفرج عن الشحنة]', bbox: [96, 420, 204, 444] },
        { text: '[ختم: الإفراج الجمركي — 03 JUL 2026]', bbox: [250, 450, 350, 500] }
      ] }
    ],
    get blocks() { return this.pages.flatMap(p => p.blocks); },
    get fullText() { return this.pages.flatMap(p => p.blocks.map(b => b.text)).join('\n'); }
  },
  'a-7001': {
    attachmentId: 'a-7001',
    engine: 'mock-ocr',
    schemaVersion: '1.0',
    fullText: 'BILL OF LADING\nB/L No: GW-2026-0630-114\nVessel: MV Sirte Star\nPort of Loading: Misrata\nPort of Discharge: Tripoli\nConsignee: Al-Karim Trading Co.\nCargo: 42 crates — machine parts\nGross Weight: 6,300 kg\nDate: 30 June 2026',
    blocks: [
      { text: 'BILL OF LADING', bbox: [110, 40, 290, 70] },
      { text: 'B/L No: GW-2026-0630-114', bbox: [40, 95, 320, 115] },
      { text: 'Vessel: MV Sirte Star', bbox: [40, 125, 250, 145] },
      { text: 'Port of Loading: Misrata', bbox: [40, 155, 270, 175] },
      { text: 'Port of Discharge: Tripoli', bbox: [40, 185, 275, 205] },
      { text: 'Consignee: Al-Karim Trading Co.', bbox: [40, 215, 330, 235] },
      { text: 'Cargo: 42 crates — machine parts', bbox: [40, 245, 330, 265] },
      { text: 'Gross Weight: 6,300 kg', bbox: [40, 275, 260, 295] },
      { text: 'Date: 30 June 2026', bbox: [40, 305, 240, 325] }
    ]
  }
};

// ---------------------------------------------------------------------------
// Generated background corpus. The curated threads above carry the scripted
// demo moments; the generator adds ~40 more threads (~550 messages) so search
// and triage behave like they would against a real, high-volume take instead
// of three hand-picked conversations. Deterministic (index math, no RNG) so
// every run of the demo is identical. All content fabricated, UNCLASSIFIED.
// ---------------------------------------------------------------------------

// Line-aligned English for the two hand-authored documents.
//
// Attached here by index rather than written inline so a source line and its
// rendering cannot be edited apart, and so the pairing is the same one the live
// gateway produces: routes/ocr.js maps the model's {src, en} onto {text, en},
// and these fixtures have to emulate that or the mock would show a bilingual
// document the enclave could not. tests/node/ocr-fixtures.test.js asserts every
// page here matches its fixture's block count.
const HAND_DOC_EN = {
  'a-7002': [
    [
      'STORAGE CONTRACT No. SK-2026-0712-09',
      'Novorossiysk · 12 July 2026',
      'Custodian: OOO "Volga-Tranzit", represented by S. Volkov',
      'Depositor: Rostov office, represented by D. Orlov',
      'Subject: storage of 30 (thirty) crates, spare parts, marked B-101 – B-130',
      'Place of storage: warehouse no. 4, berth 7, port of Novorossiysk',
    ],
    [
      'STORAGE AND PAYMENT TERMS',
      '2.1. Storage period: until 30 September 2026',
      '2.2. Storage charge: 48,000 rubles per month, payable by the 5th of the month',
      "2.3. Custodian's contact: S. Volkov, tel. +7 903 555 0147",
      '2.4. Special conditions: warehouse access by agreed list only; opening of crates is not permitted',
      '2.5. Release of cargo on written request 24 hours in advance',
    ],
    [
      'APPENDIX A — CARGO INVENTORY',
      'Crates: B-101 – B-130 (30 units)',
      'Contents: spare parts',
      'Total weight: 6,300 kg',
      'Packaging condition: undamaged',
      'Signatures: S. Volkov / D. Orlov',
      '[stamp: OOO "VOLGA-TRANZIT"]',
    ],
  ],
  'a-7003': [
    [
      'General Authority of Customs — Port of Misrata, Inbound Section',
      'Inbound Customs Declaration — Form J-14 / Detailed Statement',
      'Declaration no.: JM-2026-0703-0418',
      'Date: 3 July 2026',
      'Exporter: Al-Karim Trading Company',
      'Importer: Al-Nakheel Import Establishment',
      'Vessel: Sirte Star',
      'Voyage no.: NS-114',
      'Bill of lading: GW-2026-0630-114',
      'Port of loading: Misrata',
      'Port of discharge: Tripoli',
      'Number of packages: 42 packages',
      'Gross weight: 6,300 kg',
      'Type of goods: machinery spare parts',
      '[stamp: Misrata Customs — 03-07-2026]',
    ],
    [
      'Detailed statement of goods — packages 1–8',
      'Description of goods | Quantity | Weight (kg)',
      '1 — Diesel engines, spare parts | 6 | 940',
      '2 — Hydraulic pumps | 4 | 310',
      '3 — High-pressure valves | 12 | 185',
      '4 — Gasket and seal sets | 8 | 62',
      '5 — Oil and fuel filters | 14 | 148',
      '6 — Transmission belts | 9 | 76',
      '7 — Axle bearings | 5 | 240',
      '8 — Insulated electrical cables | 3 | 410',
      'Continued on the following page',
    ],
    [
      'Detailed statement — continued | packages 9–14 and total',
      '9 — Electronic control panels | 2 | 55',
      '10 — Lead-acid batteries | 6 | 390',
      '11 — Truck tyres, size 1200 | 4 | 680',
      '12 — Lubricating oils, drums | 3 | 600',
      '13 — Hand workshop tools | 7 | 134',
      '14 — Exterior body panels | 5 | 520',
      'Total: 42 packages | 6,300 kg',
      'Remarks: no hazardous materials in the shipment.',
      'Packages 11 and 12 require shaded storage.',
    ],
    [
      'Duties and taxes payable — statement of account RC-2026-0703-2291',
      'Declared value: 482,000 LYD',
      'Customs duty (5%): 24,100 LYD',
      'Value added tax: 19,280 LYD',
      'Handling and discharge fees: 6,750 LYD',
      'Port services fee: 2,400 LYD',
      'Total payable: 554,530 LYD',
      'Receipt no.: RC-2026-0703-2291',
      'Method of payment: bank transfer',
      'Bank: Bank of Unity — Misrata branch',
      'Payment status: paid in full',
    ],
    [
      'Inspection and release report — inspection record no. INS-2026-0703-77',
      "The shipment was inspected in full on 3 July 2026 in yard no. 7 at the port of Misrata, in the presence of the importer's representative and the shipping agent.",
      'Inspection result: conforms to the declaration — no discrepancy in count or weight. Package no. 11 has surface damage to the outer wrapping with no effect on the contents.',
      'Inspector: A. Al-Zarrouq',
      'Staff number: MC-4471',
      'Shipping agent: White Sea Clearance Company',
      '[handwritten: shipment released]',
      '[stamp: customs release — 03 JUL 2026]',
    ],
  ],
};

for (const [aid, pageEn] of Object.entries(HAND_DOC_EN)) {
  const fixture = ocr[aid];
  pageEn.forEach((en, pi) => {
    // blocks[] holds the same objects as pages[].blocks, so this reaches both.
    fixture.pages[pi].blocks.forEach((b, i) => { b.en = en[i] ?? ''; });
  });
}

const GEN_NETWORKS = ['GreenWire', 'PamirChat', 'LotusLink', 'RedSea Relay', 'Karakoram Net'];
const GEN_TITLE_A = ['Coastal', 'Depot', 'Transit', 'Harbor', 'Convoy', 'Ledger', 'Customs', 'Charter'];
const GEN_TITLE_B = ['Transfer Log', 'Payment Notes', 'Route Check', 'Manifest Sync', 'Handover Plan', 'Schedule Talk', 'Clearance Query', 'Storage Terms'];

const GEN_LOCALE = {
  ar: {
    cities: ['طرابلس', 'بنغازي', 'مصراتة', 'طبرق'],
    citiesEn: ['Tripoli', 'Benghazi', 'Misrata', 'Tobruk'],
    names: ['أبو كريم', 'حميد', 'وليد', 'سالم'],
    namesEn: ['Abu Karim', 'Hamid', 'Walid', 'Salem'],
    phones: ['+218 91 555 0176', '+218 92 555 0421', '+218 94 555 0288'],
    passports: ['LY7734120', 'LY8891245', 'LY5560398'],
    handles: ['saqr_92', 'bahr_libya', 'najm_west', 'rimal_7'],
    templates: [
      { t: 'جواز سفر {name} رقم {passport} جاهز للسفر.', e: "{nameEn}'s passport number {passport} is ready for travel." },
      { t: 'وصلت الشحنة إلى {city} مساء أمس وتم تخزينها في المستودع.', e: 'The shipment arrived in {cityEn} yesterday evening and was stored in the warehouse.' },
      { t: 'سيتولى {name} تسليم الدفعة الثانية يوم الخميس.', e: '{nameEn} will handle delivery of the second batch on Thursday.' },
      { t: 'اتصل بالوسيط على الرقم {phone} قبل الظهر.', e: 'Call the broker at {phone} before noon.' },
      { t: 'تجنب الطريق الساحلي بسبب نقطة تفتيش قرب {city}.', e: 'Avoid the coastal road because of a checkpoint near {cityEn}.' },
      { t: 'تم الدفع عن طريق مكتب الصرافة في {city}.', e: 'Payment was made through the exchange office in {cityEn}.' }
    ]
  },
  fa: {
    cities: ['هرات', 'مشهد', 'کابل', 'قندهار'],
    citiesEn: ['Herat', 'Mashhad', 'Kabul', 'Kandahar'],
    names: ['رضا توکلی', 'حاجی محمود', 'فرید', 'داوود'],
    namesEn: ['Reza Tavakoli', 'Haji Mahmoud', 'Farid', 'Dawood'],
    phones: ['0915 555 0132', '0917 555 0466', '0912 555 0850'],
    passports: ['IR4420117', 'IR9983561', 'IR2075644'],
    handles: ['kuhestan', 'daryache', 'sahra_rt', 'bazgasht'],
    templates: [
      { t: 'گذرنامه {name} با شماره {passport} آماده است.', e: "{nameEn}'s passport, number {passport}, is ready." },
      { t: 'کامیون فردا صبح از {city} حرکت می‌کند.', e: 'The truck departs {cityEn} tomorrow morning.' },
      { t: '{name} مدارک عبور را آماده کرده است.', e: '{nameEn} has prepared the transit documents.' },
      { t: 'شماره تماس راننده {phone} است.', e: "The driver's contact number is {phone}." },
      { t: 'کرایه انبار در {city} دو برابر شده است.', e: 'Warehouse rent in {cityEn} has doubled.' },
      { t: 'پرداخت پس از عبور از {city} انجام می‌شود.', e: 'Payment is made after crossing {cityEn}.' }
    ]
  },
  ru: {
    cities: ['Новороссийск', 'Астрахань', 'Ростов', 'Махачкала'],
    citiesEn: ['Novorossiysk', 'Astrakhan', 'Rostov', 'Makhachkala'],
    names: ['Сергей Волков', 'Дмитрий Орлов', 'Николай', 'Артур'],
    namesEn: ['Sergei Volkov', 'Dmitri Orlov', 'Nikolai', 'Artur'],
    phones: ['+7 903 555 0147', '+7 928 555 0362', '+7 989 555 0791'],
    passports: ['RU7712049', 'RU6650388', 'RU9034571'],
    handles: ['volga_9', 'sever_ops', 'kaspiy_rt', 'most_22'],
    templates: [
      { t: 'Паспорт {name}, номер {passport}, готов к поездке.', e: "{nameEn}'s passport, number {passport}, is ready for travel." },
      { t: 'Груз прибыл в {city} вчера вечером и размещён на складе.', e: 'The cargo arrived in {cityEn} yesterday evening and was placed in the warehouse.' },
      { t: '{name} передаст вторую партию в четверг.', e: '{nameEn} will hand over the second batch on Thursday.' },
      { t: 'Позвони посреднику по номеру {phone} до полудня.', e: 'Call the intermediary at {phone} before noon.' },
      { t: 'Избегай прибрежной дороги — пост проверки возле {city}.', e: 'Avoid the coastal road — a checkpoint near {cityEn}.' },
      { t: 'Оплата прошла через контору в {city}.', e: 'Payment went through the office in {cityEn}.' }
    ]
  },
  zh: {
    cities: ['广州', '深圳', '香港', '上海'],
    citiesEn: ['Guangzhou', 'Shenzhen', 'Hong Kong', 'Shanghai'],
    names: ['陈伟明', '李强', '王芳', '张磊'],
    namesEn: ['Chen Weiming', 'Li Qiang', 'Wang Fang', 'Zhang Lei'],
    phones: ['+86 138 5555 0244', '+86 139 5555 0873', '+86 137 5555 0512'],
    passports: ['CN E1234567', 'CN E7788221', 'CN E4055390'],
    handles: ['lianhua88', 'haiyun_hk', 'mingzhu_sz', 'donghai_9'],
    templates: [
      { t: '{name}的护照号码是{passport}，已准备好。', e: "{nameEn}'s passport number is {passport}; it is ready." },
      { t: '新一批货物明天从{city}发出。', e: 'The new batch of goods ships from {cityEn} tomorrow.' },
      { t: '{name}会在码头签收，请提前通知。', e: '{nameEn} will sign at the dock; please notify in advance.' },
      { t: '联系电话是{phone}。', e: 'The contact phone is {phone}.' },
      { t: '仓库清单已经更新，请核对。', e: 'The warehouse manifest has been updated; please verify.' },
      { t: '下周在{city}见面讨论季度安排。', e: 'Meet next week in {cityEn} to discuss the quarterly arrangements.' }
    ]
  }
};

const GEN_EN_TEMPLATES = [
  'Confirmed. The manifest matches the {cityEn} inventory.',
  'Storage fees settle through the {cityEn} account as before.',
  'Rerouting via {cityEn}; expect arrival mid-afternoon local.',
  '{nameEn} signs on arrival; the papers are complete.',
  'Understood. Holding the balance until the crates clear customs.',
  'Copy. Closing this channel until Thursday.'
];

const GEN_EN_HANDLES = ['harbor_ops', 'depot_mgr', 'trade_rt', 'ledger_ops'];

function fill(tpl, loc, k) {
  return tpl
    .replaceAll('{city}', loc.cities[k % loc.cities.length])
    .replaceAll('{cityEn}', loc.citiesEn[k % loc.citiesEn.length])
    .replaceAll('{name}', loc.names[k % loc.names.length])
    .replaceAll('{nameEn}', loc.namesEn[k % loc.namesEn.length])
    .replaceAll('{phone}', loc.phones[k % loc.phones.length])
    .replaceAll('{passport}', loc.passports[k % loc.passports.length]);
}

// Low-value "chatter" — the bulk of real take. No geo, no selector, no person,
// nothing to enrich. Present so the facet tags have to earn their keep:
// triaging 600+ messages down to the few that carry a passport or selector is
// the whole point. Keyed by locale; the English column is still searchable.
const GEN_CHATTER = {
  ar: [
    { t: 'إن شاء الله كل شيء بخير.', e: 'God willing, everything is fine.' },
    { t: 'سأتصل بك لاحقاً.', e: 'I will call you later.' },
    { t: 'الطقس حار جداً اليوم.', e: 'The weather is very hot today.' },
    { t: 'حسناً، فهمت. شكراً لك.', e: 'Okay, understood. Thank you.' }
  ],
  fa: [
    { t: 'باشه، بعداً صحبت می‌کنیم.', e: "Okay, we'll talk later." },
    { t: 'خسته نباشید.', e: 'Well done / take care.' },
    { t: 'هوا امروز خیلی سرد است.', e: 'The weather is very cold today.' },
    { t: 'ممنون، فهمیدم.', e: 'Thanks, I understand.' }
  ],
  zh: [
    { t: '好的，晚点聊。', e: 'Okay, talk later.' },
    { t: '今天天气不错。', e: 'The weather is nice today.' },
    { t: '收到，谢谢。', e: 'Received, thanks.' },
    { t: '没问题。', e: 'No problem.' }
  ],
  ru: [
    { t: 'Хорошо, поговорим позже.', e: 'Okay, we will talk later.' },
    { t: 'Сегодня хорошая погода.', e: 'The weather is nice today.' },
    { t: 'Понял, спасибо.', e: 'Understood, thanks.' },
    { t: 'Без проблем.', e: 'No problem.' }
  ]
};
const GEN_EN_CHATTER = [
  'Sounds good, talk soon.',
  'Thanks, appreciate it.',
  'Running a few minutes late.',
  'No update on my end today.'
];

const GEN_LANGS = ['ar', 'fa', 'zh', 'ru'];
// Ingest-lane mix: chat is the primary lane; transcripts and documents are a
// meaningful minority so the content-type facet has real hits.
const GEN_TYPES = ['message', 'message', 'message', 'transcript', 'document'];
const GEN_DOC_TITLES = ['Shipping Manifest', 'Border Crossing Log', 'Payment Receipt', 'Cargo Declaration'];
// Native-script OCR fixtures per language, with an English gloss the viewer can
// surface. Values are fabricated and UNCLASSIFIED.
// `en` is line-aligned with `lines`: index i of one is the rendering of index i
// of the other. The OCR viewer sets them side by side per line, so the pairing
// is positional and the arrays must stay the same length — asserted in
// tests/node/ocr-fixtures.test.js rather than left to care.
const GEN_DOC_OCR = {
  ar: { name: 'boliaset_shahn.png', gloss: 'Bill of Lading — B/L GW-2026-0630-114; Vessel Sirte Star; Load Misrata; Discharge Tripoli; Consignee Al-Karim Trading; Cargo 42 crates spare parts; 6,300 kg; 30 Jun 2026.',
    lines: ['بوليصة شحن', 'رقم البوليصة: GW-2026-0630-114', 'السفينة: نجمة سرت', 'ميناء التحميل: مصراتة', 'ميناء التفريغ: طرابلس', 'المرسل إليه: شركة الكريم للتجارة', 'البضاعة: ٤٢ صندوق قطع غيار', 'الوزن: ٦٣٠٠ كغم', 'التاريخ: ٣٠ يونيو ٢٠٢٦'],
    en: ['Bill of Lading', 'B/L number: GW-2026-0630-114', 'Vessel: Sirte Star', 'Port of loading: Misrata', 'Port of discharge: Tripoli', 'Consignee: Al-Karim Trading Company', 'Cargo: 42 crates, spare parts', 'Weight: 6,300 kg', 'Date: 30 June 2026'] },
  fa: { name: 'gozaresh_marz.png', gloss: 'Border Crossing Log — Driver Reza Tavakoli; Passport IR4420117; Crossing Dogharoun; Mashhad → Herat; freight truck; 30 Jun 2026.',
    lines: ['گزارش عبور از مرز', 'نام راننده: رضا توکلی', 'شماره گذرنامه: IR4420117', 'مرز: دوغارون', 'مبدأ: مشهد', 'مقصد: هرات', 'وسیله نقلیه: کامیون باری', 'تاریخ: ۹ تیر ۱۴۰۵'],
    en: ['Border Crossing Log', 'Driver name: Reza Tavakoli', 'Passport number: IR4420117', 'Crossing: Dogharoun', 'Origin: Mashhad', 'Destination: Herat', 'Vehicle: freight truck', 'Date: 9 Tir 1405 (30 June 2026)'] },
  zh: { name: 'huowu_shenbao.png', gloss: 'Cargo Declaration — No. LL-2026-0628-77; Vessel Donghai Star; Load Guangzhou; Discharge Hong Kong; Consignee Chen Weiming; 58 crates machine parts; 7,400 kg; 28 Jun 2026.',
    lines: ['货物申报单', '申报号：LL-2026-0628-77', '船只：东海之星', '装货港：广州', '卸货港：香港', '收货人：陈伟明', '货物：58 箱 机械零件', '重量：7,400 公斤', '日期：2026 年 6 月 28 日'],
    en: ['Cargo Declaration', 'Declaration no.: LL-2026-0628-77', 'Vessel: Donghai Star', 'Port of loading: Guangzhou', 'Port of discharge: Hong Kong', 'Consignee: Chen Weiming', 'Cargo: 58 crates, machine parts', 'Weight: 7,400 kg', 'Date: 28 June 2026'] },
  ru: { name: 'kvitanciya.png', gloss: 'Payment Receipt — No. RS-2026-0625-041; Sender S. Volkov; Recipient Rostov office; Port Novorossiysk; 30 crates; 48,000 rub; phone +7 903 555 0147; 25 Jun 2026.',
    lines: ['КВИТАНЦИЯ ОБ ОПЛАТЕ', 'Номер: RS-2026-0625-041', 'Отправитель: С. Волков', 'Получатель: контора Ростов', 'Порт: Новороссийск', 'Груз: 30 ящиков', 'Сумма: 48 000 руб.', 'Телефон: +7 903 555 0147', 'Дата: 25 июня 2026 г.'],
    en: ['PAYMENT RECEIPT', 'Number: RS-2026-0625-041', 'Sender: S. Volkov', 'Recipient: Rostov office', 'Port: Novorossiysk', 'Cargo: 30 crates', 'Amount: 48,000 rubles', 'Telephone: +7 903 555 0147', 'Date: 25 June 2026'] }
};
const GEN_TRANSCRIPT_TITLES = ['Intercept — Voice Cut', 'Call Intercept', 'Voice Collection', 'Audio Cut'];
for (let ti = 0; ti < 40; ti++) {
  const lang = GEN_LANGS[ti % GEN_LANGS.length];
  const loc = GEN_LOCALE[lang];
  const contentType = GEN_TYPES[ti % GEN_TYPES.length];
  const threadId = `t-2${String(ti).padStart(3, '0')}`;
  const network = contentType === 'transcript' ? 'Voice-Transcript' : contentType === 'document' ? 'DOCEX' : GEN_NETWORKS[ti % GEN_NETWORKS.length];
  const title = contentType === 'document'
    ? `${GEN_DOC_TITLES[ti % GEN_DOC_TITLES.length]} (${loc.citiesEn[ti % loc.citiesEn.length]})`
    : contentType === 'transcript'
      ? `${GEN_TRANSCRIPT_TITLES[ti % GEN_TRANSCRIPT_TITLES.length]} ${threadId.slice(-3)}`
      : `${GEN_TITLE_A[ti % GEN_TITLE_A.length]} ${GEN_TITLE_B[(ti * 3 + 1) % GEN_TITLE_B.length]}`;
  // Speaker/source labels per lane: chat handles, transcript speaker turns,
  // document source line. Enrichment and search behave identically across all.
  const foreignSender = contentType === 'transcript' ? 'Speaker 1'
    : contentType === 'document' ? 'document body' : loc.handles[ti % loc.handles.length];
  const enSender = contentType === 'transcript' ? 'Speaker 2'
    : contentType === 'document' ? 'document body' : GEN_EN_HANDLES[(ti + 1) % GEN_EN_HANDLES.length];
  const day = 27 - (ti % 21);
  const msgCount = 12 + (ti % 7);
  let msgs = [];
  // Message time accumulates. It used to be `7 + (mi % 11)` hours, which wraps
  // at the twelfth message and threw the tail of every 12-plus-message thread
  // back to the morning — "Audio Cut 003" ended with four messages timestamped
  // before the ones above them. Threads run 12–18 messages, so the wrap hit
  // every one of them.
  let offsetMin = 0;
  for (let mi = 0; mi < msgCount; mi++) {
    const k = ti * 7 + mi * 3;
    // Traffic mix: roughly half is low-value chatter with nothing to enrich;
    // the rest alternates entity-bearing foreign messages and English.
    const category = (mi % 5 < 2) ? 'chatter' : (mi % 2 === 0 ? 'foreign' : 'english');
    const messageId = `g-${ti}-${mi}`;
    // 31–53 minutes apart, varying, so traffic looks like traffic. Eighteen
    // messages at the widest gap still land inside the same day.
    if (mi > 0) offsetMin += 31 + ((k * 13) % 23);
    const minuteOfDay = 7 * 60 + offsetMin;
    const hh = String(Math.floor(minuteOfDay / 60)).padStart(2, '0');
    const mm = String(minuteOfDay % 60).padStart(2, '0');
    const ts = `2026-06-${String(day).padStart(2, '0')}T${hh}:${mm}:00Z`;
    if (category === 'chatter') {
      const useForeign = mi % 2 === 0;
      if (useForeign) {
        const c = GEN_CHATTER[lang][(k >> 1) % GEN_CHATTER[lang].length];
        msgs.push({ messageId, ts, sender: { handle: foreignSender, network }, lang, dir: (lang === 'zh' || lang === 'ru') ? 'ltr' : 'rtl', text: c.t });
        translations[messageId] = c.e;
      } else {
        msgs.push({ messageId, ts, sender: { handle: enSender, network }, lang: 'en', dir: 'ltr', text: GEN_EN_CHATTER[(k >> 1) % GEN_EN_CHATTER.length] });
      }
      // no entities — this is the noise the facets filter out
    } else if (category === 'foreign') {
      const tpl = loc.templates[(k >> 1) % loc.templates.length];
      msgs.push({ messageId, ts, sender: { handle: foreignSender, network }, lang, dir: (lang === 'zh' || lang === 'ru') ? 'ltr' : 'rtl', text: fill(tpl.t, loc, k) });
      translations[messageId] = fill(tpl.e, loc, k);
      // Entity index: record only the entity types the template actually
      // references, using the English form as the canonical value (so a geo-
      // fence keyed on "Tripoli" matches Arabic, Russian, and English alike).
      const ents = [];
      if (tpl.t.includes('{name}')) ents.push({ type: 'person', text: loc.namesEn[k % loc.namesEn.length], confidence: 0.9 });
      if (tpl.t.includes('{city}')) ents.push({ type: 'geo', text: loc.citiesEn[k % loc.citiesEn.length], confidence: 0.92 });
      if (tpl.t.includes('{phone}')) ents.push({ type: 'phone', text: loc.phones[k % loc.phones.length], confidence: 0.98 });
      if (tpl.t.includes('{passport}')) ents.push({ type: 'passport', text: loc.passports[k % loc.passports.length], confidence: 0.96 });
      if (ents.length) entities[messageId] = ents;
    } else {
      const enTpl = GEN_EN_TEMPLATES[(k >> 1) % GEN_EN_TEMPLATES.length];
      msgs.push({ messageId, ts, sender: { handle: enSender, network }, lang: 'en', dir: 'ltr', text: fill(enTpl, loc, k) });
      const ents = [];
      if (enTpl.includes('{cityEn}')) ents.push({ type: 'geo', text: loc.citiesEn[k % loc.citiesEn.length], confidence: 0.9 });
      if (enTpl.includes('{nameEn}')) ents.push({ type: 'person', text: loc.namesEn[k % loc.namesEn.length], confidence: 0.9 });
      if (ents.length) entities[messageId] = ents;
    }
  }
  // A document lane item is a STANDALONE document, not a conversation: it is
  // an OCR'd file (native script) with no surrounding chat. The generated chat
  // messages above are discarded and replaced by a single document entry, so
  // the content-type facet, the OCR viewer, and the has-image facet all agree.
  // OCR on Arabic, Farsi, Chinese, and Cyrillic script is core to the mission.
  if (contentType === 'document') {
    const doc = GEN_DOC_OCR[lang];
    const aid = `a-${threadId}`;
    const docMsgId = `${threadId}-doc`;
    const rtl = !(lang === 'zh' || lang === 'ru');
    msgs = [{
      messageId: docMsgId, ts: `2026-06-${String(day).padStart(2, '0')}T09:00:00Z`,
      sender: { handle: 'document body', network: 'DOCEX' }, lang, dir: rtl ? 'rtl' : 'ltr',
      text: doc.lines.slice(1).join('  ·  '),
      attachments: [{ attachmentId: aid, type: 'image', name: doc.name, uri: `/static/attachments/a-doc-${lang}.png` }]
    }];
    translations[docMsgId] = doc.gloss;
    // Entities the document exposes, so facets (geo, and passport where present) still work.
    const ents = [{ type: 'geo', text: loc.citiesEn[ti % loc.citiesEn.length], confidence: 0.9 }];
    if (doc.gloss.includes('Passport') || lang === 'fa') ents.push({ type: 'passport', text: loc.passports[ti % loc.passports.length], confidence: 0.95 });
    if (doc.gloss.includes('phone') || lang === 'ru') ents.push({ type: 'phone', text: loc.phones[ti % loc.phones.length], confidence: 0.97 });
    entities[docMsgId] = ents;
    ocr[aid] = { attachmentId: aid, engine: 'mock-ocr', schemaVersion: '1.0', srcLang: lang,
      fullText: doc.lines.join('\n'), englishGloss: doc.gloss,
      blocks: doc.lines.map((t, i) => ({ text: t, en: doc.en[i], bbox: [40, 40 + i * 30, 330, 62 + i * 30] })) };
  }
  // Not every document is standalone: a few arrive INSIDE a conversation (a
  // source attaches a file mid-chat). These stay 'message' threads — the doc
  // lives in the thread and the has-image facet + OCR viewer still find it.
  if (contentType === 'message' && [10, 17, 31].includes(ti) && msgs.length > 3) {
    const doc = GEN_DOC_OCR[lang];
    const aid = `a-${threadId}`;
    const target = msgs[3];
    target.attachments = [{ attachmentId: aid, type: 'image', name: doc.name, uri: `/static/attachments/a-doc-${lang}.png` }];
    ocr[aid] = { attachmentId: aid, engine: 'mock-ocr', schemaVersion: '1.0', srcLang: lang,
      fullText: doc.lines.join('\n'), englishGloss: doc.gloss,
      blocks: doc.lines.map((t, i) => ({ text: t, en: doc.en[i], bbox: [40, 40 + i * 30, 330, 62 + i * 30] })) };
  }
  threads.push({
    threadId, title, network, contentType,
    languages: [lang, 'en'],
    participants: contentType === 'document' ? 1 : 2,
    lastActivity: msgs[msgs.length - 1].ts,
    messageCount: msgs.length
  });
  messages[threadId] = msgs;
  summaries[threadId] = `Participants coordinate logistics and payment involving ${loc.citiesEn[(ti * 7) % loc.citiesEn.length]}; contact ${loc.namesEn[(ti * 7) % loc.namesEn.length]} handles handover. (Auto-generated background thread for scale demonstration.)`;
}

// ---------------------------------------------------------------------------
// A standing channel — one conversation, kept whole.
//
// Every other thread here is one day of 12–18 messages, and any renderer
// handles 18. That left the corpus with nothing big enough to show the windowed
// message stream doing anything, so the only evidence for TDD 3.3 was a
// synthetic thread that existed inside a test and nowhere a Sponsor could see.
//
// This is the shape the targeting officer described on 8 August: a high-tempo
// dispatch channel that runs for weeks and is NOT broken up. A thread of five
// thousand messages stays one thread, and the analyst works the whole thing —
// the conversation is the unit, and cutting it at a day boundary or a message
// count would destroy exactly the continuity they read it for.
//
// That is also what makes virtualization load-bearing rather than theoretical:
// the corpus now contains a thread nobody could render un-windowed.
// ---------------------------------------------------------------------------
const CH_START_DAY = 14;   // 14–27 June, inside the window the rest of the corpus uses
const CH_DAYS = 14;
const CH_LANG = 'ar';
const CH_LOC = GEN_LOCALE[CH_LANG];
const CH_NETWORK = 'GreenWire';

// Messages per collection day. Days 3 and 9 are surges — a convoy movement and
// a port closure — and are the days that exercise the split.
const chVolume = (d) => (d === 3 ? 620 : d === 9 ? 840 : 55 + ((d * 37) % 45));

const chMsgs = [];
for (let d = 0; d < CH_DAYS; d++) {
  const day = CH_START_DAY + d;
  const count = chVolume(d);

  for (let mi = 0; mi < count; mi++) {
    const k = d * 11 + mi * 3;
    const messageId = `ch-${d}-${mi}`;
    // Spread across a 06:00–22:00 operating day, so a surge day genuinely reads
    // as busier traffic rather than the same day with a bigger number on it.
    const minuteOfDay = 6 * 60 + Math.floor((mi * 960) / count) + (k % 3);
    const hh = String(Math.floor(minuteOfDay / 60)).padStart(2, '0');
    const mm = String(minuteOfDay % 60).padStart(2, '0');
    const ts = `2026-06-${String(day).padStart(2, '0')}T${hh}:${mm}:00Z`;
    // Several handles, because this is a group channel and not a pair.
    const foreignSender = CH_LOC.handles[k % CH_LOC.handles.length];
    const enSender = GEN_EN_HANDLES[k % GEN_EN_HANDLES.length];
    const category = (mi % 5 < 2) ? 'chatter' : (mi % 2 === 0 ? 'foreign' : 'english');

    if (category === 'chatter') {
      if (mi % 2 === 0) {
        const c = GEN_CHATTER[CH_LANG][(k >> 1) % GEN_CHATTER[CH_LANG].length];
        chMsgs.push({ messageId, ts, sender: { handle: foreignSender, network: CH_NETWORK }, lang: CH_LANG, dir: 'rtl', text: c.t });
        translations[messageId] = c.e;
      } else {
        chMsgs.push({ messageId, ts, sender: { handle: enSender, network: CH_NETWORK }, lang: 'en', dir: 'ltr', text: GEN_EN_CHATTER[(k >> 1) % GEN_EN_CHATTER.length] });
      }
    } else if (category === 'foreign') {
      const tpl = CH_LOC.templates[(k >> 1) % CH_LOC.templates.length];
      chMsgs.push({ messageId, ts, sender: { handle: foreignSender, network: CH_NETWORK }, lang: CH_LANG, dir: 'rtl', text: fill(tpl.t, CH_LOC, k) });
      translations[messageId] = fill(tpl.e, CH_LOC, k);
      const ents = [];
      if (tpl.t.includes('{name}')) ents.push({ type: 'person', text: CH_LOC.namesEn[k % CH_LOC.namesEn.length], confidence: 0.9 });
      if (tpl.t.includes('{city}')) ents.push({ type: 'geo', text: CH_LOC.citiesEn[k % CH_LOC.citiesEn.length], confidence: 0.92 });
      if (tpl.t.includes('{phone}')) ents.push({ type: 'phone', text: CH_LOC.phones[k % CH_LOC.phones.length], confidence: 0.98 });
      if (tpl.t.includes('{passport}')) ents.push({ type: 'passport', text: CH_LOC.passports[k % CH_LOC.passports.length], confidence: 0.96 });
      if (ents.length) entities[messageId] = ents;
    } else {
      const enTpl = GEN_EN_TEMPLATES[(k >> 1) % GEN_EN_TEMPLATES.length];
      chMsgs.push({ messageId, ts, sender: { handle: enSender, network: CH_NETWORK }, lang: 'en', dir: 'ltr', text: fill(enTpl, CH_LOC, k) });
      const ents = [];
      if (enTpl.includes('{cityEn}')) ents.push({ type: 'geo', text: CH_LOC.citiesEn[k % CH_LOC.citiesEn.length], confidence: 0.9 });
      if (enTpl.includes('{nameEn}')) ents.push({ type: 'person', text: CH_LOC.namesEn[k % CH_LOC.namesEn.length], confidence: 0.9 });
      if (ents.length) entities[messageId] = ents;
    }
  }

}

// One thread, whole. No day boundary, no message cap.
{
  const threadId = 't-3000';
  threads.push({
    threadId,
    title: 'Harbor Dispatch — Misrata (standing channel)',
    network: CH_NETWORK,
    contentType: 'message',
    languages: [CH_LANG, 'en'],
    participants: CH_LOC.handles.length + GEN_EN_HANDLES.length,
    lastActivity: chMsgs[chMsgs.length - 1].ts,
    messageCount: chMsgs.length,
  });
  messages[threadId] = chMsgs;
  summaries[threadId] = `Standing dispatch channel for Misrata harbour, ${CH_START_DAY}–${CH_START_DAY + CH_DAYS - 1} June: berth allocation, cargo handover and payment clearance across ${CH_DAYS} collection days, including two operational surges. Kept as one conversation — the continuity across days is the reporting value.`;
}

// ---------------------------------------------------------------------------
// Groups: named collections an analyst triages against, mirroring two real
// tradecraft patterns.
//  - geofence: a named region resolved to a set of geo entities. "Show me
//    everything touching the Libyan coast" without naming each city.
//  - watchlist: a tagged set of selectors (handles / phone numbers). "Show me
//    everything from these accounts" — the selector-tagging pattern.
// Values are canonical (English geo names, raw selector strings) so a group
// matches across every language in the corpus.
// ---------------------------------------------------------------------------
const groups = [
  { id: 'geo-libya-coast', kind: 'geofence', label: 'Libya Coast', entityType: 'geo',
    members: ['Tripoli', 'Benghazi', 'Misrata', 'Tobruk'] },
  { id: 'geo-caspian-basin', kind: 'geofence', label: 'Caspian Basin', entityType: 'geo',
    members: ['Novorossiysk', 'Astrakhan', 'Rostov', 'Makhachkala'] },
  { id: 'geo-khorasan-corridor', kind: 'geofence', label: 'Khorasan Corridor', entityType: 'geo',
    members: ['Herat', 'Mashhad', 'Kabul', 'Kandahar', 'Islam Qala', 'Dogharoun crossing'] },
  { id: 'geo-pearl-river', kind: 'geofence', label: 'Pearl River Delta', entityType: 'geo',
    members: ['Guangzhou', 'Shenzhen', 'Hong Kong', 'Shanghai'] },
  { id: 'wl-priority-handles', kind: 'watchlist', label: 'Priority Handles', entityType: 'selector',
    members: ['saqr_92', 'kuhestan', 'lianhua88', 'volga_9'] },
  { id: 'wl-flagged-numbers', kind: 'watchlist', label: 'Flagged Numbers', entityType: 'selector',
    members: ['+218 91 555 0142', '+218 91 555 0176', '+7 903 555 0147', '+86 138 5555 0199'] }
];

module.exports = { threads, messages, translations, entities, summaries, ocr, groups };
