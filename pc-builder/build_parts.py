import json, re, datetime

D = "data/"
def load(t): return [x for x in json.load(open(D + t + ".json")) if x.get("price")]
def r2(v): return round(float(v), 2)

# ---- CPU socket from microarchitecture (dataset has no socket field) ----
SOCK = {
 "Zen":"AM4","Zen+":"AM4","Zen 2":"AM4","Zen 3":"AM4","Zen 4":"AM5","Zen 5":"AM5",
 "Skylake":"LGA1151","Kaby Lake":"LGA1151","Coffee Lake":"LGA1151","Coffee Lake Refresh":"LGA1151",
 "Comet Lake":"LGA1200","Rocket Lake":"LGA1200",
 "Alder Lake":"LGA1700","Raptor Lake":"LGA1700","Raptor Lake Refresh":"LGA1700",
 "Arrow Lake":"LGA1851",
 "Haswell":"LGA1150","Haswell Refresh":"LGA1150","Broadwell":"LGA1150",
 "Ivy Bridge":"LGA1155","Sandy Bridge":"LGA1155",
}
def cpu_socket(x):
    n = x["name"]
    if "Threadripper" in n or "Xeon" in n or "EPYC" in n: return None
    return SOCK.get(x.get("microarchitecture"))

cpu = [dict(n=x["name"], p=r2(x["price"]), sock=cpu_socket(x), cores=x.get("core_count"),
            base=x.get("core_clock"), boost=x.get("boost_clock"), tdp=x.get("tdp"),
            igpu=x.get("graphics")) for x in load("cpu")]

# ---- GPU board power (approx. official total board power, W) ----
TBP = [
 (r"5090",575),(r"5080",360),(r"5070 Ti",300),(r"5070",250),(r"5060 Ti",180),(r"5060",145),(r"5050",130),
 (r"4090",450),(r"4080",320),(r"4070 Ti",285),(r"4070 SUPER",220),(r"4070",200),(r"4060 Ti",160),(r"4060",115),
 (r"3090",350),(r"3080 Ti",350),(r"3080",320),(r"3070 Ti",290),(r"3070",220),(r"3060 Ti",200),(r"3060",170),(r"3050",130),
 (r"9070 XT",304),(r"9070",220),(r"9060 XT",160),
 (r"7900 XTX",355),(r"7900 XT",315),(r"7900 GRE",260),(r"7800 XT",263),(r"7700 XT",245),(r"7600 XT",190),(r"7600",165),
 (r"6950 XT",335),(r"6900 XT",300),(r"6800 XT",300),(r"6800",250),(r"6750 XT",250),(r"6700 XT",230),(r"6650 XT",180),(r"6600 XT",160),(r"6600",132),
]
def tbp(chip):
    for pat, w in TBP:
        if re.search(pat, chip or "", re.I): return w
    return None

gpu = [dict(n=x["name"], p=r2(x["price"]), chip=x.get("chipset"), vram=x.get("memory"),
            boost=x.get("boost_clock"), len=x.get("length"), tbp=tbp(x.get("chipset")))
       for x in load("video-card")]

# ---- Motherboards ----
FFR = {"Mini ITX":1,"Thin Mini ITX":1,"Mini DTX":1,"Micro ATX":2,"ATX":3,"EATX":4,"XL ATX":4,"SSI CEB":4}
DDR_BY_SOCK = {"AM5":[5],"LGA1851":[5],"AM4":[4],"LGA1200":[4],"LGA2066":[4],"LGA1151":[3,4],
               "LGA1700":[4,5],"LGA1150":[3],"LGA1155":[3],"AM3":[3]}
def mobo_ddr(x):
    n = x["name"]
    if re.search(r"DDR4|\bD4\b", n, re.I): return [4]
    if re.search(r"DDR5|\bD5\b", n, re.I): return [5]
    return DDR_BY_SOCK.get(x.get("socket"))
mobo = [dict(n=x["name"], p=r2(x["price"]), sock=x.get("socket"), ff=x.get("form_factor"),
             ffr=FFR.get(x.get("form_factor")), slots=x.get("memory_slots"),
             maxmem=x.get("max_memory"), ddr=mobo_ddr(x)) for x in load("motherboard")]

# ---- Memory ----
ram = []
for x in load("memory"):
    if not x.get("speed") or not x.get("modules"): continue
    ram.append(dict(n=x["name"], p=r2(x["price"]), ddr=x["speed"][0], mhz=x["speed"][1],
                    kit=x["modules"][0], gb=x["modules"][1], cas=x.get("cas_latency")))

# ---- Storage ----
def kind(t):
    if t == "SSD": return "SSD"
    return ("HDD " + str(t) + " rpm") if t else "HDD"
storage = [dict(n=x["name"], p=r2(x["price"]), cap=x.get("capacity"), kind=kind(x.get("type")),
                ff=str(x.get("form_factor")), iface=x.get("interface")) for x in load("internal-hard-drive")]

# ---- PSU ----
psu = [dict(n=x["name"], p=r2(x["price"]), w=x.get("wattage"), eff=x.get("efficiency"),
            mod=x.get("modular"), type=x.get("type")) for x in load("power-supply")]

# ---- Case ----
def case_rank(t):
    if t.startswith("Mini ITX"): return 1
    if t.startswith("MicroATX"): return 2
    if t == "ATX Full Tower": return 4
    if t.startswith("ATX"): return 3
    return None
case = [dict(n=x["name"], p=r2(x["price"]), type=x.get("type"), ffr=case_rank(x.get("type") or ""),
             panel=x.get("side_panel")) for x in load("case")]

# ---- Cooler ----
cooler = [dict(n=x["name"], p=r2(x["price"]), rpm=x.get("rpm"), noise=x.get("noise_level"),
               size=x.get("size")) for x in load("cpu-cooler")]

out = dict(cpu=cpu, gpu=gpu, mobo=mobo, ram=ram, storage=storage, psu=psu, case=case, cooler=cooler)
for k in out:
    out[k] = [i for i in out[k] if i["p"] > 0]
    out[k].sort(key=lambda i: i["p"])
out["meta"] = dict(source="docyx/pc-part-dataset (scraped from PCPartPicker, MIT)",
                   currency="USD", built=datetime.date.today().isoformat(),
                   counts={k: len(v) for k, v in out.items() if k != "meta"})
json.dump(out, open("pc-builder/parts.json", "w"), separators=(",", ":"))
print(out["meta"])
import os; print(os.path.getsize("pc-builder/parts.json")//1024, "KB")
print("cpu socket known:", sum(1 for c in cpu if c["sock"]), "/", len(cpu))
print("gpu tbp known:", sum(1 for g in gpu if g["tbp"]), "/", len(gpu))
