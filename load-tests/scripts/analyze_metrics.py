import json
import statistics

def analyze():
    with open("load-tests/results/sustained-system-metrics.json", "r", encoding="utf-8") as f:
        data = json.load(f)
        
    print(f"Total samples collected: {len(data)}")
    if not data:
        return
        
    java_mem = [d.get("java_mem_mb", 0) for d in data if "java_mem_mb" in d]
    java_threads = [d.get("java_threads", 0) for d in data if "java_threads" in d]
    mysql_conns = [int(d.get("Threads_connected", 0)) for d in data if "Threads_connected" in d]
    sys_ram_pct = [d.get("ram_used_pct", 0) for d in data if "ram_used_pct" in d]
    free_ram = [d.get("free_ram_mb", 0) for d in data if "free_ram_mb" in d]
    
    summary = {
        "samples_count": len(data),
        "java_mem_mb": {
            "min": min(java_mem),
            "max": max(java_mem),
            "avg": round(statistics.mean(java_mem), 2)
        },
        "java_threads": {
            "min": min(java_threads),
            "max": max(java_threads),
            "avg": round(statistics.mean(java_threads), 2)
        },
        "mysql_threads_connected": {
            "min": min(mysql_conns),
            "max": max(mysql_conns),
            "avg": round(statistics.mean(mysql_conns), 2)
        },
        "system_ram_used_pct": {
            "min": min(sys_ram_pct),
            "max": max(sys_ram_pct),
            "avg": round(statistics.mean(sys_ram_pct), 2)
        },
        "free_ram_mb": {
            "min": min(free_ram),
            "max": max(free_ram),
            "avg": round(statistics.mean(free_ram), 2)
        }
    }
    
    with open("load-tests/results/system-metrics-summary.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    print(json.dumps(summary, indent=2))

if __name__ == "__main__":
    analyze()
