import urllib.request
import time
import json
import statistics

ROUTES = [
    ("Homepage", "http://localhost:3000/"),
    ("Events Page", "http://localhost:3000/events"),
    ("Announcements Page", "http://localhost:3000/announcements"),
    ("Login Page", "http://localhost:3000/auth/login"),
]

def measure_route(name, url, iterations=40):
    durations = []
    status_codes = []
    print(f"Measuring {name} ({url}) across {iterations} iterations...")
    
    for i in range(iterations):
        t0 = time.perf_counter()
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 NotifyHub-LoadTest/1.0"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                _ = resp.read()
                code = resp.status
        except Exception as e:
            code = 500
        t1 = time.perf_counter()
        durations.append((t1 - t0) * 1000.0) # in ms
        status_codes.append(code)
        time.sleep(0.05)
        
    durations.sort()
    n = len(durations)
    
    def percentile(p):
        idx = int(p / 100.0 * n)
        idx = min(idx, n - 1)
        return round(durations[idx], 2)
        
    return {
        "route": name,
        "url": url,
        "samples": n,
        "success_rate_pct": round(status_codes.count(200) / n * 100, 2),
        "min_ms": round(min(durations), 2),
        "median_ms": percentile(50),
        "p90_ms": percentile(90),
        "p95_ms": percentile(95),
        "p99_ms": percentile(99),
        "max_ms": round(max(durations), 2),
        "avg_ms": round(statistics.mean(durations), 2)
    }

def main():
    results = []
    for name, url in ROUTES:
        res = measure_route(name, url)
        results.append(res)
        print(f"  -> {name}: Median={res['median_ms']}ms, p95={res['p95_ms']}ms, p99={res['p99_ms']}ms")
        
    with open("load-tests/results/frontend-performance.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print("Frontend performance benchmark complete -> load-tests/results/frontend-performance.json")

if __name__ == "__main__":
    main()
