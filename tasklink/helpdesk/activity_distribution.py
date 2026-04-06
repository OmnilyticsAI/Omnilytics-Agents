from typing import List, Tuple, Dict

def generate_activity_heatmap(
    timestamps: List[int],
    counts: List[int],
    buckets: int = 10,
    normalize: bool = True
) -> List[float]:
    """
    Bucket activity counts into 'buckets' time intervals,
    returning either raw counts or normalized [0.0–1.0].

    Args:
        timestamps: list of epoch ms timestamps.
        counts: list of integer counts per timestamp.
        buckets: number of buckets to group into.
        normalize: if True, normalize to 0.0–1.0 scale.

    Returns:
        List of bucket values.
    """
    if not timestamps or not counts or len(timestamps) != len(counts):
        return []

    t_min, t_max = min(timestamps), max(timestamps)
    span = t_max - t_min or 1
    bucket_size = span / buckets

    agg = [0] * buckets
    for t, c in zip(timestamps, counts):
        idx = min(buckets - 1, int((t - t_min) / bucket_size))
        agg[idx] += c

    if normalize:
        m = max(agg) or 1
        return [round(val / m, 4) for val in agg]
    return agg

def generate_activity_matrix(
    timestamps: List[int],
    counts: List[int],
    buckets: int = 10,
    normalize: bool = True
) -> List[Tuple[int, float]]:
    """
    Produce heatmap as list of (bucket_index, value) pairs.
    """
    values = generate_activity_heatmap(timestamps, counts, buckets, normalize)
    return list(enumerate(values))

def heatmap_summary(
    timestamps: List[int],
    counts: List[int],
    buckets: int = 10
) -> Dict[str, float]:
    """
    Provide summary statistics for a given heatmap distribution.
    """
    values = generate_activity_heatmap(timestamps, counts, buckets, normalize=False)
    total = sum(values)
    max_val = max(values) if values else 0
    avg_val = total / buckets if buckets > 0 else 0
    return {
        "total": total,
        "max": max_val,
        "average": round(avg_val, 2),
        "nonzero_buckets": sum(1 for v in values if v > 0),
    }
