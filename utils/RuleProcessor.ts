import { parse } from 'logical-expression-parser';

export interface Rule {
  pathSpec: string;
  tagMatch?: string; // todo: settings.use_regex_to_check_for_tags
  titleMatchRegex?: RegExp;
}

export interface FileMetadata {
  frontmatter: Record<string, unknown>;
  title: string;
  tags: string[];
}

export class RuleProcessor {
  constructor(private rules: Rule[]) {}

  getDestinationPath(fileMetadata: FileMetadata): string | false {
    for (const rule of this.rules) {
      if (this.ruleMatches(rule, fileMetadata)) {
        const path = this.processPathSpec(rule.pathSpec, fileMetadata.frontmatter);
        if (path !== false) {
          return path;
        }
      }
    }
    return false;
  }
  
  private parseTest(input: string): { parameter: string, value: string } {
    const regex = /^(\w+)\[(\w+)\]$/;
    const match = input.match(regex);
    if (match) {
        return { parameter: match[1], value: match[2] };
    }
    return { parameter: '!!!', value: 'nfg' };
  }

  private expressionEvaluator(condition: string, fileMetadata: FileMetadata): boolean {
    const { parameter, value } = this.parseTest(condition);
    let answer = false;
    switch(parameter) {
      case '!!!':
        break;
      case 'has':
        answer = this.hasFrontmatterTest(value, fileMetadata);
        break;
      case 'tag':
        answer = this.tagTest(`#${value}`, fileMetadata);
        break;
      case 'title':
        answer = this.titleTest(value, fileMetadata);
        break;
      default:
        answer = this.frontmatterTest(parameter, value, fileMetadata);
        break;
    }
    // console.log('condition', condition, answer);
    return answer;
  }

  private tagTest = (tag: string, fileMetadata: FileMetadata) => fileMetadata.tags.includes(tag);
  private titleTest = (title: string, fileMetadata: FileMetadata) => new RegExp(title).test(fileMetadata.title);
  private hasFrontmatterTest = ( property: string, fileMetadata: FileMetadata) => {
    const propVal = fileMetadata.frontmatter[property];
    return !!(Array.isArray(propVal) ? propVal[0] : propVal);
  }
  private frontmatterTest = ( property: string, value: string, fileMetadata: FileMetadata) => {
    const propVal = fileMetadata.frontmatter[property];
    return value === (Array.isArray(propVal) ? propVal[0] : propVal);
  }

  private ruleMatches(rule: Rule, fileMetadata: FileMetadata): boolean {
    if (!rule.tagMatch && !rule.titleMatchRegex) {
      return true;
    }

    if (rule.tagMatch && rule.titleMatchRegex) {
      return fileMetadata.tags.includes(rule.tagMatch) && rule.titleMatchRegex.test(fileMetadata.title);
    }
    if (rule.tagMatch) {
      if (rule.tagMatch.startsWith('=')) {
        return parse(rule.tagMatch.substring(1), (cond: string) => this.expressionEvaluator(cond, fileMetadata));
      }
      return fileMetadata.tags.includes(rule.tagMatch);
    }
    if (rule.titleMatchRegex) {
      return rule.titleMatchRegex.test(fileMetadata.title);
    }
    return false;
  }

  private processPathSpec(pathSpec: string, frontmatter: Record<string, unknown>): string | false {
    const pattern = /<([^>]+)>/g;
    let path = pathSpec;
    let match;
    while ((match = pattern.exec(pathSpec)) !== null) {
      const token = match[1];
      const propVal = frontmatter[token];
      if (propVal !== undefined) {
        const firstValue = Array.isArray(propVal) ? propVal[0] : propVal;
        if (firstValue) {
          path = path.replace(`<${token}>`, String(firstValue));
        } else {
          return false;
        }
      } else {
        return false;
      }
    }
    return path;
  }
}