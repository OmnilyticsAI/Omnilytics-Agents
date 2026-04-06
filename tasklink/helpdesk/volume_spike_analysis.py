from typing import List, Dict, Any

def detect_volume_bursts(
    volumes: List[float],
    threshold_ratio: float = 1.5,
    min_interval: int = 1
) -> List[Dict[str, Any]]:
    """
    Identify indices where volume jumps by threshold_ratio over the previous value.
    Returns list of dicts: {index, previous, current, ratio, delta}.
    
    Args:
        volumes: sequential list of volume values
        threshold_ratio: minimum jump ratio to flag as burst
        min_interval: minimum spacing between two detected bursts (in indices)
    
    Example:
        detect_volume_bursts([10, 12, 30, 45], 2.0)
        -> [{'index': 2, 'previous': 12, 'current': 30, 'ratio': 2.5, 'delta': 18}]
    """
    events: List[Dict[str, Any]] = []
    last_idx = -min_interval
    for i in range(1, len(volumes)):
        prev, curr = volumes[i - 1], volumes[i]
        if prev <= 0:
            ratio = float("inf") if curr > 0 else 1.0
        else:
            ratio = curr / prev

        if ratio >= threshold_ratio and (i - last_idx) >= min_interval:
            events.append({
                "index": i,
                "previous": prev,
                "current": curr,
                "ratio": round(ratio, 4),
                "delta": curr - prev,
            })
            last_idx = i
    return events

def summarize_bursts(events: List[Dict[str, Any]]) -> Dict[str, float]:
    """
    Summarize detected bursts with count, max ratio, and average delta.
    """
    if not events:
        return {"count": 0, "max_ratio": 0.0, "avg_delta": 0.0}
    count = len(events)
    max_ratio = max(e["ratio"] for e in events)
    avg_delta = sum(e["delta"] for e in events) / count
    return {"count": count, "max_ratio": max_ratio, "avg_delta": round(avg_delta, 2)}
