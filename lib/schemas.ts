// JSON Schemas for extracting VC and team data from web pages
// Used with Hyperbrowser's structured JSON extraction

export const VC_EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "The VC firm or fund name"
    },
    website: {
      type: "string",
      description: "The main website URL of the VC"
    },
    investmentThesis: {
      type: "string",
      description: "Investment thesis or focus areas - what sectors, themes, or types of companies they invest in"
    },
    portfolioCompanies: {
      type: "array",
      items: { type: "string" },
      description: "Notable portfolio companies (5-15 examples)"
    },
    checkSize: {
      type: "string",
      description: "Typical check size or investment range (e.g. '$500K - $2M', 'Seed: $1-3M')"
    },
    stageFocus: {
      type: "array",
      items: { type: "string" },
      description: "Investment stages they focus on (e.g. seed, Series A, growth)"
    },
    fundName: {
      type: "string",
      description: "Name of the fund if different from firm name (e.g. 'Fund V')"
    }
  },
  required: ["name"],
  additionalProperties: false
};

export interface VCData {
  name: string;
  website?: string;
  investmentThesis?: string;
  portfolioCompanies?: string[];
  checkSize?: string;
  stageFocus?: string[];
  fundName?: string;
}

export const TEAM_EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    teamMembers: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Full name of the partner or team member"
          },
          title: {
            type: "string",
            description: "Job title (e.g. Partner, Principal, Associate)"
          },
          linkedIn: {
            type: "string",
            description: "LinkedIn profile URL if available"
          },
          focusAreas: {
            type: "array",
            items: { type: "string" },
            description: "Investment focus areas or sectors they cover"
          }
        },
        required: ["name", "title"]
      },
      description: "List of partners and key decision makers at the VC"
    }
  },
  required: ["teamMembers"],
  additionalProperties: false
};

export interface TeamMember {
  name: string;
  title: string;
  linkedIn?: string;
  focusAreas?: string[];
}

export interface TeamExtractionResult {
  teamMembers: TeamMember[];
}
