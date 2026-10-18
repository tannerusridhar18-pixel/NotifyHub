import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom Metrics
export const http2xxRate = new Rate('rate_2xx');
export const expectedNegativeRate = new Rate('rate_expected_negatives');
export const http429Rate = new Rate('rate_429_ratelimit');
export const http5xxRate = new Rate('rate_5xx_errors');

export const readLatency = new Trend('duration_reads');
export const writeLatency = new Trend('duration_writes');
export const registrationLatency = new Trend('duration_registration');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const OPEN_EVENT_ID = 166;
const CSE_EVENT_ID = 167;
const AIML_EVENT_ID = 168;

function getXsrf(jar) {
    const cookies = jar.cookiesForURL(BASE_URL);
    return cookies['XSRF-TOKEN'] ? cookies['XSRF-TOKEN'][0] : '';
}

// 1. Public Browsing Journey (40% weight)
export function publicBrowsing() {
    const resEvents = http.get(`${BASE_URL}/api/v1/events?page=0&size=10`);
    readLatency.add(resEvents.timings.duration);
    check(resEvents, {
        'public events status 200': (r) => r.status === 200,
        'public events not empty': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.data && body.data.content && body.data.content.length > 0;
            } catch (e) {
                return false;
            }
        },
        'public events excludes drafts': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.data.content.every((e) => e.status !== 'DRAFT');
            } catch (e) {
                return false;
            }
        }
    });
    recordHttpStatus(resEvents.status);

    sleep(0.4);

    const resAnnounce = http.get(`${BASE_URL}/api/v1/announcements?page=0&size=10`);
    readLatency.add(resAnnounce.timings.duration);
    check(resAnnounce, {
        'public announcements status 200': (r) => r.status === 200,
    });
    recordHttpStatus(resAnnounce.status);

    sleep(0.4);

    const resUrgent = http.get(`${BASE_URL}/api/v1/announcements/urgent?page=0&size=10`);
    readLatency.add(resUrgent.timings.duration);
    check(resUrgent, {
        'urgent feed status 200': (r) => r.status === 200,
    });
    recordHttpStatus(resUrgent.status);

    sleep(0.4);

    const resUpcoming = http.get(`${BASE_URL}/api/v1/events/upcoming?page=0&size=10`);
    readLatency.add(resUpcoming.timings.duration);
    check(resUpcoming, {
        'upcoming events status 200': (r) => r.status === 200,
    });
    recordHttpStatus(resUpcoming.status);
}

// 2. Student Authentication & Profile Journey (20% weight)
export function studentAuthAndProfile(vuId) {
    const studentNum = ((vuId - 1) % 250) + 1;
    const email = `loadtest_stu_${studentNum}@notifyhub.loadtest`;
    const jar = http.cookieJar();

    const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
        email: email,
        password: 'admin@123'
    }), {
        headers: { 'Content-Type': 'application/json' },
        jar: jar
    });
    writeLatency.add(loginRes.timings.duration);
    check(loginRes, {
        'student login status 200': (r) => r.status === 200,
    });
    recordHttpStatus(loginRes.status);

    if (loginRes.status !== 200) return;

    sleep(0.3);

    const meRes = http.get(`${BASE_URL}/api/v1/users/me`, { jar: jar });
    readLatency.add(meRes.timings.duration);
    check(meRes, {
        'users/me status 200': (r) => r.status === 200,
    });
    recordHttpStatus(meRes.status);

    sleep(0.3);

    const myRegs = http.get(`${BASE_URL}/api/v1/events/my-registrations`, { jar: jar });
    readLatency.add(myRegs.timings.duration);
    check(myRegs, {
        'my-registrations status 200': (r) => r.status === 200,
    });
    recordHttpStatus(myRegs.status);
}

// 3. Student Event Registration & Duplicate Check (15% weight)
export function studentRegistration(vuId) {
    const studentNum = ((vuId - 1) % 250) + 1;
    const email = `loadtest_stu_${studentNum}@notifyhub.loadtest`;
    const jar = http.cookieJar();

    // Login
    const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
        email: email,
        password: 'admin@123'
    }), {
        headers: { 'Content-Type': 'application/json' },
        jar: jar
    });
    if (loginRes.status !== 200) {
        recordHttpStatus(loginRes.status);
        return;
    }

    let xsrf = getXsrf(jar);

    // Initial Registration Attempt (201 or 409 if already registered in an earlier iteration)
    const regRes = http.post(`${BASE_URL}/api/v1/events/${OPEN_EVENT_ID}/register`, '{}', {
        headers: {
            'Content-Type': 'application/json',
            'X-XSRF-TOKEN': xsrf
        },
        jar: jar,
        responseCallback: http.expectedStatuses(201, 409)
    });
    registrationLatency.add(regRes.timings.duration);
    writeLatency.add(regRes.timings.duration);

    check(regRes, {
        'register status is 201 or 409': (r) => r.status === 201 || r.status === 409,
    });
    if (regRes.status === 201) {
        http2xxRate.add(true);
    } else if (regRes.status === 409) {
        expectedNegativeRate.add(true);
    } else {
        recordHttpStatus(regRes.status);
    }

    sleep(0.3);

    // Refresh XSRF token for subsequent state change
    xsrf = getXsrf(jar);

    // Explicit Duplicate Registration Attempt (MUST return 409 Conflict)
    const dupRes = http.post(`${BASE_URL}/api/v1/events/${OPEN_EVENT_ID}/register`, '{}', {
        headers: {
            'Content-Type': 'application/json',
            'X-XSRF-TOKEN': xsrf
        },
        jar: jar,
        responseCallback: http.expectedStatuses(409)
    });
    check(dupRes, {
        'duplicate register returns 409': (r) => r.status === 409,
    });
    if (dupRes.status === 409) {
        expectedNegativeRate.add(true);
    } else {
        recordHttpStatus(dupRes.status);
    }
}

// 4. Event Inspection & Scoped Admin Access (10% weight)
export function eventInspectionAndAdminAccess(vuId) {
    const jar = http.cookieJar();
    const studentNum = ((vuId - 1) % 250) + 1;

    // Authenticate to view event details (since GET /api/v1/events/{id} requires authentication)
    http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
        email: `loadtest_stu_${studentNum}@notifyhub.loadtest`,
        password: 'admin@123'
    }), {
        headers: { 'Content-Type': 'application/json' },
        jar: jar
    });

    const detailRes = http.get(`${BASE_URL}/api/v1/events/${OPEN_EVENT_ID}`, { jar: jar });
    readLatency.add(detailRes.timings.duration);
    check(detailRes, {
        'event detail 200': (r) => r.status === 200,
    });
    recordHttpStatus(detailRes.status);

    sleep(0.3);

    // Department Admin Scoped Access
    const jarDept = http.cookieJar();
    const loginDept = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
        email: 'loadtest_deptadmin_cse@notifyhub.loadtest',
        password: 'admin@123'
    }), {
        headers: { 'Content-Type': 'application/json' },
        jar: jarDept
    });

    if (loginDept.status === 200) {
        // Allowed: CSE registrations
        const cseRegs = http.get(`${BASE_URL}/api/v1/events/${CSE_EVENT_ID}/registrations`, { jar: jarDept });
        readLatency.add(cseRegs.timings.duration);
        check(cseRegs, {
            'cse admin views own dept registrations 200': (r) => r.status === 200,
        });
        recordHttpStatus(cseRegs.status);

        // Forbidden: AIML registrations (Expected 403 Forbidden)
        const aimlRegs = http.get(`${BASE_URL}/api/v1/events/${AIML_EVENT_ID}/registrations`, {
            jar: jarDept,
            responseCallback: http.expectedStatuses(403)
        });
        check(aimlRegs, {
            'cse admin blocked from other dept 403': (r) => r.status === 403,
        });
        if (aimlRegs.status === 403) {
            expectedNegativeRate.add(true);
        } else {
            recordHttpStatus(aimlRegs.status);
        }
    } else {
        recordHttpStatus(loginDept.status);
    }
}

// 5. Admin Draft Event Flow (5% weight)
export function adminDraftFlow(vuId) {
    const jarAdmin = http.cookieJar();
    const loginAdmin = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
        email: 'admin@notifyhub.local',
        password: 'admin@123'
    }), {
        headers: { 'Content-Type': 'application/json' },
        jar: jarAdmin
    });
    if (loginAdmin.status !== 200) {
        recordHttpStatus(loginAdmin.status);
        return;
    }

    let xsrf = getXsrf(jarAdmin);

    // Save Draft Event
    const draftPayload = JSON.stringify({
        title: `Draft Event Automated LoadTest VU${vuId}`,
        description: 'Verifying draft creation and exclusion under load.',
        location: 'Virtual Test Lab',
        startAt: '2026-11-20T10:00:00Z',
        endAt: '2026-11-20T12:00:00Z',
        targetType: 'GLOBAL',
        recipientType: 'global',
        status: 'DRAFT',
        registrationEnabled: false
    });

    const createRes = http.post(`${BASE_URL}/api/v1/events`, draftPayload, {
        headers: {
            'Content-Type': 'application/json',
            'X-XSRF-TOKEN': xsrf
        },
        jar: jarAdmin
    });
    writeLatency.add(createRes.timings.duration);
    check(createRes, {
        'create draft status 201': (r) => r.status === 201,
        'created draft has DRAFT status': (r) => {
            try {
                return JSON.parse(r.body).data.status === 'DRAFT';
            } catch (e) {
                return false;
            }
        }
    });
    recordHttpStatus(createRes.status);

    if (createRes.status === 201) {
        try {
            const draftId = JSON.parse(createRes.body).data.id;
            // Re-read XSRF token before next state-changing request
            xsrf = getXsrf(jarAdmin);

            const updatePayload = JSON.stringify({
                title: `Draft Event Automated LoadTest VU${vuId} Updated`,
                description: 'Updated draft content to verify edit flow.',
                location: 'Virtual Test Lab B',
                startAt: '2026-11-20T10:00:00Z',
                endAt: '2026-11-20T12:00:00Z',
                targetType: 'GLOBAL',
                recipientType: 'global',
                status: 'DRAFT',
                registrationEnabled: false
            });
            const updateRes = http.put(`${BASE_URL}/api/v1/events/${draftId}`, updatePayload, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-XSRF-TOKEN': xsrf
                },
                jar: jarAdmin
            });
            writeLatency.add(updateRes.timings.duration);
            check(updateRes, {
                'update draft status 200': (r) => r.status === 200,
            });
            recordHttpStatus(updateRes.status);
        } catch (e) {}
    }
}

// 6. Search, Filter & Pagination Journey (5% weight)
export function searchAndPagination() {
    const resPage1 = http.get(`${BASE_URL}/api/v1/events?page=1&size=5`);
    readLatency.add(resPage1.timings.duration);
    check(resPage1, {
        'events page 1 status 200': (r) => r.status === 200,
    });
    recordHttpStatus(resPage1.status);

    sleep(0.3);

    const resAnnouncePage = http.get(`${BASE_URL}/api/v1/announcements?page=0&size=5`);
    readLatency.add(resAnnouncePage.timings.duration);
    check(resAnnouncePage, {
        'announcements page 0 status 200': (r) => r.status === 200,
    });
    recordHttpStatus(resAnnouncePage.status);
}

function recordHttpStatus(status) {
    if (status >= 200 && status < 300) {
        http2xxRate.add(true);
    } else {
        http2xxRate.add(false);
    }

    if (status === 429) {
        http429Rate.add(true);
    } else {
        http429Rate.add(false);
    }

    if (status >= 500) {
        http5xxRate.add(true);
    } else {
        http5xxRate.add(false);
    }
}
