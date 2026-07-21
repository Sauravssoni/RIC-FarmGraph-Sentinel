// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { standaloneMandiPrices } from "../src/lib/mandi";

describe("AGMARKNET mandi — standalone mirror of the API adapter", () => {
  it("returns SAMPLE-labelled quotes for a pilot crop with exact normalisation", () => {
    const r = standaloneMandiPrices("bajra");
    expect(r.state).toBe("MANDI_CREDENTIALS_REQUIRED");
    expect(r.provenance).toContain("SAMPLE SHAPE");
    expect(r.provenance).not.toContain("CACHED_MANDI_DATA");
    expect(r.quotes.length).toBe(2);
    const jodhpur = r.quotes.find((q) => q.district === "Jodhpur");
    expect(jodhpur?.mandi).toBe("Jodhpur (Grain)");
    expect(jodhpur?.modalPriceInrQuintal).toBe(2460);
    expect(jodhpur?.unit).toBe("INR/quintal");
    expect(jodhpur?.marketType).toContain("APMC");
    expect(jodhpur?.state).toBe("Rajasthan");
    expect(r.attribution).toContain("data.gov.in");
  });

  it("district filter narrows quotes (mirror of the API district param)", () => {
    const r = standaloneMandiPrices("bajra", "Nagaur");
    expect(r.quotes.length).toBe(1);
    expect(r.quotes[0].mandi).toBe("Nagaur (Grain)");
    expect(r.quotes[0].modalPriceInrQuintal).toBe(2405);
  });

  it("commodity aliases match official AGMARKNET spellings", () => {
    // sample uses "Bajra(Pearl Millet/Cumbu)" — only reachable via the alias table
    expect(standaloneMandiPrices("guar").quotes[0]?.mandi).toBe("Merta");
    expect(standaloneMandiPrices("cumin").quotes.length).toBe(2);
    expect(standaloneMandiPrices("mustard").quotes[0]?.modalPriceInrQuintal).toBe(5280);
  });

  it("non-pilot crops return NO_MANDI_DATA_FOR_CROP with an empty quote list", () => {
    const r = standaloneMandiPrices("wheat");
    expect(r.state).toBe("NO_MANDI_DATA_FOR_CROP");
    expect(r.quotes).toEqual([]);
    expect(r.provenance).toContain("pilot crops");
  });

  it("pilot crop with no district record yields empty quotes, never fabricated prices", () => {
    const r = standaloneMandiPrices("guar", "Jodhpur");
    expect(r.quotes).toEqual([]);
    expect(r.recordCount).toBe(0);
    expect(r.state).toBe("MANDI_CREDENTIALS_REQUIRED");
  });
});
