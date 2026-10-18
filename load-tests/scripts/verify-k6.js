import http from 'k6/http';
import { check } from 'k6';

export const options = {
    vus: 1,
    iterations: 1,
};

export default function () {
    const loginRes = http.post('http://localhost:8080/api/v1/auth/login', JSON.stringify({
        email: 'loadtest_stu_1@notifyhub.loadtest',
        password: 'admin@123'
    }), {
        headers: { 'Content-Type': 'application/json' }
    });

    check(loginRes, {
        'login status 200': (r) => r.status === 200,
    });

    const vuJar = http.cookieJar();
    const cookies = vuJar.cookiesForURL('http://localhost:8080/');
    const xsrf = cookies['XSRF-TOKEN'] ? cookies['XSRF-TOKEN'][0] : '';

    const meRes = http.get('http://localhost:8080/api/v1/users/me');
    check(meRes, {
        'me status 200': (r) => r.status === 200,
    });

    console.log(`Login status: ${loginRes.status}, XSRF: ${xsrf ? 'present' : 'missing'}, Me status: ${meRes.status}`);
}
