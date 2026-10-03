import hashlib
import json
import pytest

# Constants mirroring backend spec
CLAIM_TYPES = {
    'ORGANIZATION': 'Organization',
    'MENTOR_CLIENT': 'Mentor/Client',
    'PEER': 'Peer',
    'SELF': 'Self',
}

TRUST_WEIGHTS = {
    'Organization': 10,
    'Mentor/Client': 8,
    'Peer': 3,
    'Self': 0,
}

def calculate_trust_score(verified_claims):
    """
    Python reference implementation of the TrustMesh Trust Score Service (Dev B)
    """
    base_score = 50
    raw_points = 0
    verifier_counts = {}
    breakdown = {'organization': 0, 'mentorClient': 0, 'peer': 0, 'self': 0, 'other': 0}

    for claim in verified_claims:
        ctype = claim.get('type', 'Other')
        points = TRUST_WEIGHTS.get(ctype, 2)

        if ctype == 'Organization':
            breakdown['organization'] += 1
        elif ctype == 'Mentor/Client':
            breakdown['mentorClient'] += 1
        elif ctype == 'Peer':
            breakdown['peer'] += 1
        elif ctype == 'Self':
            breakdown['self'] += 1
        else:
            breakdown['other'] += 1

        verifier = (claim.get('verifierWallet') or 'unknown').lower()
        verifier_counts[verifier] = verifier_counts.get(verifier, 0) + 1
        if verifier_counts[verifier] > 2:
            points = round(points * 0.5)

        raw_points += points

    final_score = min(100, max(0, base_score + raw_points))
    
    badges = []
    if final_score >= 90:
        badges.append('Master of Trust')
    elif final_score >= 75:
        badges.append('Verified Expert')
    elif final_score >= 60:
        badges.append('Trusted Contributor')
    else:
        badges.append('Rising Member')

    if breakdown['organization'] >= 2:
        badges.append('Institutional Endorsed')
    if breakdown['mentorClient'] >= 3:
        badges.append('Client Approved')

    return {
        'score': final_score,
        'baseScore': base_score,
        'verifiedPoints': raw_points,
        'totalVerified': len(verified_claims),
        'breakdown': breakdown,
        'badges': badges
    }

def generate_evidence_sha256(content: bytes) -> str:
    """Computes SHA-256 for evidence buffer matching backend hashService"""
    return hashlib.sha256(content).hexdigest()

def format_auth_message(wallet_address: str, nonce: str) -> str:
    """Formats auth message matching backend signatureVerify.js"""
    return f"Sign this message to authenticate with TrustMesh:\nWallet: {wallet_address.lower()}\nNonce: {nonce}"


# --- Pytest Test Cases ---

def test_evidence_hashing():
    """Test SHA-256 evidence generation parity"""
    data = b"Certificate of Completion in Web3 Architecture for Alice Nakamoto"
    digest = generate_evidence_sha256(data)
    assert len(digest) == 64
    assert digest == hashlib.sha256(data).hexdigest()

def test_auth_message_formatting():
    """Test standard wallet sign-in message template formatting"""
    wallet = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
    nonce = "abcd1234efgh5678"
    msg = format_auth_message(wallet, nonce)
    assert "Sign this message to authenticate with TrustMesh:" in msg
    assert wallet.lower() in msg
    assert nonce in msg

def test_trust_score_calculation_base():
    """Test base score with no verified claims"""
    result = calculate_trust_score([])
    assert result['score'] == 50
    assert result['verifiedPoints'] == 0
    assert result['totalVerified'] == 0
    assert 'Rising Member' in result['badges']

def test_trust_score_calculation_weighted_sources():
    """Test score increases with weighted verification sources"""
    claims = [
        {'type': 'Organization', 'verifierWallet': '0x1111111111111111111111111111111111111111'},
        {'type': 'Organization', 'verifierWallet': '0x2222222222222222222222222222222222222222'},
        {'type': 'Mentor/Client', 'verifierWallet': '0x3333333333333333333333333333333333333333'},
        {'type': 'Peer', 'verifierWallet': '0x4444444444444444444444444444444444444444'},
        {'type': 'Self', 'verifierWallet': '0x5555555555555555555555555555555555555555'},
    ]
    # Expected: base 50 + Org(10) + Org(10) + Mentor(8) + Peer(3) + Self(0) = 81
    result = calculate_trust_score(claims)
    assert result['score'] == 81
    assert result['verifiedPoints'] == 31
    assert result['totalVerified'] == 5
    assert result['breakdown']['organization'] == 2
    assert result['breakdown']['mentorClient'] == 1
    assert result['breakdown']['peer'] == 1
    assert result['breakdown']['self'] == 1
    assert 'Institutional Endorsed' in result['badges']
    assert 'Verified Expert' in result['badges']

def test_trust_score_duplicate_verifier_dampening():
    """Test duplicate verifier dampening rule (50% reduction after 2 claims)"""
    v_wallet = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
    claims = [
        {'type': 'Organization', 'verifierWallet': v_wallet}, # +10
        {'type': 'Organization', 'verifierWallet': v_wallet}, # +10
        {'type': 'Organization', 'verifierWallet': v_wallet}, # +5 (dampened)
    ]
    result = calculate_trust_score(claims)
    # Expected: 50 + 10 + 10 + 5 = 75
    assert result['score'] == 75
    assert result['verifiedPoints'] == 25

def test_trust_score_cap_at_100():
    """Test trust score max cap at 100"""
    claims = [
        {'type': 'Organization', 'verifierWallet': f'0x{i:040x}'} for i in range(1, 10)
    ] # 9 * 10 = +90
    result = calculate_trust_score(claims)
    assert result['score'] == 100
    assert 'Master of Trust' in result['badges']
