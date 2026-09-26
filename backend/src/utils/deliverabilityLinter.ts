export interface LintReport {
  score: number;
  status: 'GREEN' | 'YELLOW' | 'RED';
  issues: string[];
  recommendations: string[];
}

export function lintEmailContent(subject: string, body: string): LintReport {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let score = 100;

  const combined = `${subject} ${body}`;
  const lowerCombined = combined.toLowerCase();

  // 1. High-risk spam keywords
  const spamKeywords = [
    'free',
    'urgent',
    '100%',
    'guarantee',
    'buy now',
    'act now',
    'no risk',
    'cash',
    'discount',
    'winner',
    'click here',
    'limited time',
    'risk-free',
    'earn money',
    'make $$$',
  ];

  const matchedKeywords: string[] = [];
  for (const keyword of spamKeywords) {
    if (lowerCombined.includes(keyword)) {
      matchedKeywords.push(keyword);
    }
  }

  if (matchedKeywords.length > 0) {
    const penalty = Math.min(40, matchedKeywords.length * 10);
    score -= penalty;
    issues.push(`Contains spam trigger phrase(s): ${matchedKeywords.map((k) => `"${k}"`).join(', ')}`);
    recommendations.push('Replace sales-heavy trigger phrases with conversational tone.');
  }

  // 2. Excessive Capitalization
  const alphaChars = combined.replace(/[^a-zA-Z]/g, '');
  if (alphaChars.length >= 10) {
    const uppercaseChars = combined.replace(/[^A-Z]/g, '');
    const uppercaseRatio = uppercaseChars.length / alphaChars.length;
    if (uppercaseRatio > 0.35) {
      score -= 15;
      issues.push(`Excessive capitalization (${Math.round(uppercaseRatio * 100)}% uppercase letters)`);
      recommendations.push('Reduce all-caps words to avoid triggering spam filters.');
    }
  }

  // 3. Excessive Exclamation Marks
  const exclamationCount = (combined.match(/!/g) || []).length;
  if (exclamationCount > 2 || combined.includes('!!')) {
    score -= 15;
    issues.push(`Contains ${exclamationCount} exclamation marks or repeated '!'`);
    recommendations.push('Limit exclamation marks to 1 or zero.');
  }

  // 4. Missing Template Fallbacks
  const templateVarRegex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  const unhandledVars: string[] = [];
  let match;
  while ((match = templateVarRegex.exec(combined)) !== null) {
    unhandledVars.push(match[1]);
  }

  if (unhandledVars.length > 0) {
    score -= 10;
    issues.push(`Template variable(s) missing fallbacks: ${unhandledVars.map((v) => `{{${v}}}`).join(', ')}`);
    recommendations.push('Provide fallback values (e.g. {{firstName | "there"}}) to handle missing lead fields.');
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  let status: 'GREEN' | 'YELLOW' | 'RED' = 'GREEN';
  if (score < 50) {
    status = 'RED';
  } else if (score < 70) {
    status = 'YELLOW';
  }

  return {
    score,
    status,
    issues,
    recommendations,
  };
}
