/* -------------------------------------------------
    GLOBAL VARIABLES / PROTOTYPES (F0R 2026)
------------------------------------------------- */
// Update annually via https://aspe.hhs.gov/topics/poverty-economic-mobility/poverty-guidelines
const BASE_POVERTY = { ak: 19550, hi: 17990, base: 15650 };
const INCREMENT_POVERTY = { ak: 6880, hi: 6330, base: 5500 };
const COMMUNITY_PROPERTY_STATES = ['az', 'ca', 'id', 'la', 'nv', 'nm', 'tx', 'wa', 'wi'];
const CPI_U_MULTIPLIER = 1.028; // "Consumer Price Index for All Urban Consumers" estimate for next 30 years
const STANDARD_DEDUCTIONS = {
    'SINGLE'    : 16100,
    'HOH'       : 24150,
    'MARRIED'   : 32200,
}
const INCOME_BRACKETS = {
    'single': [
        {'min': 0,          'max': 12400,       'rate': 0.10 },
        {'min': 12401,      'max': 50400,       'rate': 0.12 },
        {'min': 50401,      'max': 105700,      'rate': 0.22 },
        {'min': 105701,     'max': 201775,      'rate': 0.24 },
        {'min': 201776,     'max': 256225,      'rate': 0.32 },
        {'min': 256226,     'max': 640600,      'rate': 0.35 },
        {'min': 640601,     'max': Infinity,    'rate': 0.37 },
    ],
    'married': [
        {'min': 0,          'max': 24800,       'rate': 0.10 },
        {'min': 24801,      'max': 100800,      'rate': 0.12 },
        {'min': 100801,     'max': 211400,      'rate': 0.22 },
        {'min': 211401,     'max': 403550,      'rate': 0.24 },
        {'min': 403551,     'max': 512450,      'rate': 0.32 },
        {'min': 512451,     'max': 768700,      'rate': 0.35 },
        {'min': 768701,     'max': Infinity,    'rate': 0.37 },
    ]
}