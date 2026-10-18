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
        { duration: '10s', target: 20 },
        { duration: '20s', target: 50 },
        { duration: '30s', target: 100 },
        { duration: '10s', target: 0 },
    ],
    thresholds: {
        http_req_failed: ['rate<0.01'], // Acceptance target: < 1% failures
        duration_reads: ['p(95)<1000'], // Acceptance target: p95 <= 1000ms
        duration_writes: ['p(95)<2000'], // Acceptance target: p95 <= 2000ms
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
        eventInspectionAndAdminAccess();
    } else if (r < 0.95) {
        adminDraftFlow(vuId);
    } else {
        searchAndPagination();
    }
}
