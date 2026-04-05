"""Seed data for financial institutions — Egyptian banks, BNPL, digital wallets."""

BANKS = [
    {
        "slug": "nbe",
        "name_en": "National Bank of Egypt",
        "name_ar": "البنك الأهلي المصري",
        "is_popular": True,
        "sort_order": 1,
    },
    {
        "slug": "banque-misr",
        "name_en": "Banque Misr",
        "name_ar": "بنك مصر",
        "is_popular": True,
        "sort_order": 2,
    },
    {
        "slug": "cib",
        "name_en": "Commercial International Bank",
        "name_ar": "البنك التجاري الدولي",
        "is_popular": True,
        "sort_order": 3,
    },
    {
        "slug": "qnb-alahli",
        "name_en": "QNB Alahli",
        "name_ar": "بنك QNB الأهلي",
        "is_popular": True,
        "sort_order": 4,
    },
    {
        "slug": "hsbc",
        "name_en": "HSBC Egypt",
        "name_ar": "إتش إس بي سي مصر",
        "is_popular": True,
        "sort_order": 5,
    },
    {
        "slug": "bank-of-alexandria",
        "name_en": "Bank of Alexandria",
        "name_ar": "بنك الإسكندرية",
        "is_popular": True,
        "sort_order": 6,
    },
    {
        "slug": "aaib",
        "name_en": "Arab African International Bank",
        "name_ar": "البنك العربي الأفريقي الدولي",
    },
    {
        "slug": "credit-agricole",
        "name_en": "Crédit Agricole Egypt",
        "name_ar": "كريدي أجريكول مصر",
    },
    {
        "slug": "adib",
        "name_en": "Abu Dhabi Islamic Bank Egypt",
        "name_ar": "مصرف أبوظبي الإسلامي مصر",
    },
    {
        "slug": "banque-du-caire",
        "name_en": "Banque du Caire",
        "name_ar": "بنك القاهرة",
    },
    {
        "slug": "faisal-islamic",
        "name_en": "Faisal Islamic Bank",
        "name_ar": "بنك فيصل الإسلامي",
    },
    {
        "slug": "al-baraka",
        "name_en": "Al Baraka Bank Egypt",
        "name_ar": "بنك البركة مصر",
    },
    {
        "slug": "export-development",
        "name_en": "Export Development Bank",
        "name_ar": "البنك المصري لتنمية الصادرات",
    },
    {
        "slug": "egyptian-arab-land",
        "name_en": "Egyptian Arab Land Bank",
        "name_ar": "البنك العقاري المصري العربي",
    },
    {
        "slug": "suez-canal",
        "name_en": "Suez Canal Bank",
        "name_ar": "بنك قناة السويس",
    },
    {
        "slug": "housing-development",
        "name_en": "Housing and Development Bank",
        "name_ar": "بنك الإسكان والتعمير",
    },
    {
        "slug": "saib",
        "name_en": "Saib Bank",
        "name_ar": "بنك saib",
    },
    {
        "slug": "kfh-egypt",
        "name_en": "Kuwait Finance House Egypt",
        "name_ar": "بيت التمويل الكويتي مصر",
    },
    {
        "slug": "mashreq",
        "name_en": "Mashreq Bank Egypt",
        "name_ar": "بنك المشرق مصر",
    },
    {
        "slug": "emirates-nbd",
        "name_en": "Emirates NBD Egypt",
        "name_ar": "بنك الإمارات دبي الوطني مصر",
    },
    {
        "slug": "attijariwafa",
        "name_en": "Attijariwafa Bank Egypt",
        "name_ar": "التجاري وفا بنك مصر",
    },
    {
        "slug": "arab-bank",
        "name_en": "Arab Bank",
        "name_ar": "البنك العربي",
    },
    {
        "slug": "audi-bank",
        "name_en": "Bank Audi",
        "name_ar": "بنك عودة",
    },
    {
        "slug": "midb",
        "name_en": "MIDB – Misr Iran Development Bank",
        "name_ar": "بنك مصر إيران للتنمية",
    },
    {
        "slug": "abu-dhabi-commercial",
        "name_en": "Abu Dhabi Commercial Bank",
        "name_ar": "بنك أبوظبي التجاري",
    },
]

BNPL_PROVIDERS = [
    {"slug": "valu", "name_en": "ValU", "name_ar": "ﭬاليو"},
    {"slug": "souhoola", "name_en": "Souhoola", "name_ar": "سهولة"},
    {"slug": "sympl", "name_en": "Sympl", "name_ar": "سيمبل"},
    {"slug": "forsa", "name_en": "Forsa", "name_ar": "فرصة"},
    {"slug": "tru", "name_en": "Tru", "name_ar": "ترو"},
    {"slug": "khazna", "name_en": "Khazna", "name_ar": "خزنة"},
    {"slug": "mnt-halan", "name_en": "MNT-Halan", "name_ar": "هالان"},
    {"slug": "shahry", "name_en": "Shahry", "name_ar": "شهري"},
    {"slug": "contact", "name_en": "Contact", "name_ar": "كونتكت"},
    {"slug": "premium-card", "name_en": "Premium Card", "name_ar": "بريميوم كارد"},
    {"slug": "aman", "name_en": "Aman", "name_ar": "أمان"},
]

DIGITAL_WALLET_PROVIDERS = [
    {"slug": "vodafone-cash", "name_en": "Vodafone Cash", "name_ar": "فودافون كاش"},
    {"slug": "orange-cash", "name_en": "Orange Cash", "name_ar": "اورنج كاش"},
    {"slug": "etisalat-cash", "name_en": "Etisalat Cash", "name_ar": "اتصالات كاش"},
    {"slug": "we-pay", "name_en": "WE Pay", "name_ar": "وي باي"},
    {"slug": "fawry", "name_en": "Fawry", "name_ar": "فوري"},
    {"slug": "instapay", "name_en": "InstaPay", "name_ar": "انستاباي"},
    {"slug": "bm-wallet", "name_en": "BM Wallet", "name_ar": "محفظة بنك مصر"},
    {"slug": "nbe-phone-cash", "name_en": "NBE Phone Cash", "name_ar": "فون كاش الأهلي"},
    {"slug": "cib-smart-wallet", "name_en": "CIB Smart Wallet", "name_ar": "المحفظة الذكية CIB"},
]
