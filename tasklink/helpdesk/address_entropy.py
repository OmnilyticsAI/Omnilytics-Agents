import math
from typing import List, Dict, Any

def compute_shannon_entropy(addresses: List[str]) -> float:
    """
    Compute Shannon entropy (bits) of an address sequence.
    Returns 0.0 if the list is empty.
    """
    if not addresses:
        return 0.0
    freq: Dict[str, int] = {}
    for a in addresses:
        freq[a] = freq.get(a, 0) + 1
    total = len(addresses)
    entropy = 0.0
    for count in freq.values():
        p = count / total
        entropy -= p * math.log2(p)
    return round(entropy, 4)

def entropy_breakdown(addresses: List[str]) -> Dict[str, Any]:
    """
    Return detailed breakdown of entropy calculation:
    - frequencies
    - probabilities
    - individual contributions
    - total entropy
    """
    if not addresses:
        return {
            "total": 0,
            "frequencies": {},
            "probabilities": {},
            "contributions": {},
            "entropy": 0.0,
        }
    freq: Dict[str, int] = {}
    for a in addresses:
        freq[a] = freq.get(a, 0) + 1
    total = len(addresses)

    probabilities: Dict[str, float] = {}
    contributions: Dict[str, float] = {}
    entropy = 0.0

    for addr, count in freq.items():
        p = count / total
        probabilities[addr] = round(p, 4)
        contrib = -p * math.log2(p)
        contributions[addr] = round(contrib, 4)
        entropy += contrib

    return {
        "total": total,
        "frequencies": freq,
        "probabilities": probabilities,
        "contributions": contributions,
        "entropy": round(entropy, 4),
    }

def normalized_entropy(addresses: List[str]) -> float:
    """
    Compute normalized entropy [0.0–1.0], where 1.0 = maximum diversity.
    """
    if not addresses:
        return 0.0
    unique_count = len(set(addresses))
    max_entropy = math.log2(unique_count) if unique_count > 0 else 1
    actual_entropy = compute_shannon_entropy(addresses)
    return round(actual_entropy / max_entropy, 4) if max_entropy > 0 else 0.0
