import {
    publicBrowsing,
    studentAuthAndProfile,
    studentRegistration,
    eventInspectionAndAdminAccess,
    adminDraftFlow,
    searchAndPagination
} from './scenarios.js';

export const options = {
    stages: [
        { duration: '30s', target: 200 },  // Quick ramp to 200
        { duration: '30s', target: 250 },  // Step to 250 VUs
        { duration: '60s', target: 300 },  // Step to 300 VUs
        { duration: '60s', target: 300 },  // Hold at 300 VUs
        { duration: '30s', target: 0 },    // Ramp down to 0
    ],
    thresholds: {
        rate_5xx_errors: ['rate<0.05'],
    },
};

export default function () {
    const vuId = __VU;
    const r = Math.random();

    if (r < 0.40) {
        publicBrowsing();
    } else if (r < 0.65) {
        studentAuthAndProfile(vuId);
    } else if (r < 0.80) {
        studentRegistration(vuId);
    } else if (r < 0.90) {
        eventInspectionAndAdminAccess(vuId);
    } else if (r < 0.95) {
        adminDraftFlow(vuId);
    } else {
        searchAndPagination();
    }
}
