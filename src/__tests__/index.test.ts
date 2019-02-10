import fetch from "cross-fetch";
import targetPosition, { setMirror, IPosition } from "../index";

// A NOTE ON LANGUAGE:
//
// "resolving" is used with two meanings in this file:
//
// 1. Calling the resolve function in a promise.
// 2. Getting the target position from the target name.

const MOCK_MIRROR_URL = "http://mock.saao.ac.za/";

const NO_TARGET_XML = `<Sesame xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://vizier.u-strasbg.fr/xml/sesame_4x.xsd">
<Target option="V">
<name>HIP123456</name>
<!--  Q24770845 #1  -->
<INFO>*** Nothing found ***</INFO>
</Target>
</Sesame>
<!-- - ====Done (2019-Feb-05,21:35:26z)====  -->`;

const targetXml = (
  ra: string,
  dec: string
) => `<Sesame xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://vizier.u-strasbg.fr/xml/sesame_4x.xsd">
<Target option="V">
<name>HIP123</name>
<!--  Q24770814 #1  -->
<Resolver name="V1=VizieR (CDS)">
<!-- delay: 0ms [0]  -->
<INFO>from cache</INFO>
<jpos>00:01:35.97 +72:14:11.8</jpos>
<jradeg>${ra}</jradeg>
<jdedeg>${dec}</jdedeg>
<oname>{HIP} 123</oname>
</Resolver>
</Target>
</Sesame>
<!-- - ====Done (2019-Feb-05,21:35:03z)====  -->`;

describe("targetPosition", () => {
  // reset mocks

  beforeEach(() => {
    setMirror(MOCK_MIRROR_URL);
    (fetch as any).mockReset();
  });

  afterEach(() => {
    (fetch as any).mockReset();
  });

  // target name checks

  it("should return a rejected promise if the target name is an empty string", () => {
    expect.assertions(1);
    return targetPosition("").catch(err =>
      expect(err).toContain("target name")
    );
  });

  it("should return a rejected promise if the target name only contains white space", () => {
    expect.assertions(1);
    return targetPosition(" \t  \n\n ").catch(err =>
      expect(err).toContain("target name")
    );
  });

  it("should return a rejected promise if the target name is null", () => {
    expect.assertions(1);
    const name: any = null; // Fool TypeScript into accepting null
    return targetPosition(name).catch(err =>
      expect(err).toContain("target name")
    );
  });

  it("should return a rejected promise if the target name is undefined", () => {
    expect.assertions(1);
    const name: any = undefined; // Fool TypeScript into accepting undefined
    return targetPosition(name).catch(err =>
      expect(err).toContain("target name")
    );
  });

  // resolver checks

  it("should return a rejected promise if an empty array of resolvers is given", () => {
    expect.assertions(1);
    return targetPosition("A", []).catch(err =>
      expect(err).toContain("At least one resolver")
    );
  });

  it("should return a rejected promise if an unsupported resolver is given", () => {
    expect.assertions(1);
    const resolvers: any = ["Simbad", "Xft56", "NED"]; // Fool TypeScript into accepting an invalid resolver
    return targetPosition("A", resolvers).catch(err =>
      expect(err).toMatch(/resolver is.*: Xft56/)
    );
  });

  it("should return a rejected promise if multiple unsupported resolvers are given", () => {
    expect.assertions(1);
    const resolvers: any = ["Simbad", "Xft56", "NED", "A56tyu"]; // Fool TypeScript into accepting invalid resolvers
    return targetPosition("A", resolvers).catch(err =>
      expect(err).toMatch(/resolvers are.*: Xft56, A56tyu/)
    );
  });

  it("should return a rejected promise if a resolver is included more than once", () => {
    expect.assertions(1);
    const resolvers: any = ["Simbad", "NED", "simbad", "VizieR"]; // Fool TypeScript into accepting the resolvers
    return targetPosition("A", resolvers).catch(err =>
      expect(err).toContain("used only once")
    );
  });

  // errors while resolving the target name

  it("should return a rejected promise if a network error occurs", async () => {
    expect.assertions(1);
    const error = 'There was a problem with accessing the web service.';
    (fetch as any).mockRejectedValue(new Error(error));
    return targetPosition("A", ["Simbad"]).catch(err =>
      expect(err.message).toEqual(error)
    );
  });

  it("should return a rejected promise if Sesame is not happy", async () => {
    expect.assertions(1);
    const error = "Sesame is not happy.";
    (fetch as any).mockResolvedValue({ text: () => Promise.resolve(error), ok: false });
    return targetPosition("A", ["Simbad"]).catch(err =>
      expect(err.message).toEqual(error)
    );
  });

  // URL used for resolving the target name

  it("should encode the target name in the URL", async () => {
    (fetch as any).mockResolvedValue({
      text: () => Promise.resolve(targetXml("0", "0")),
      ok: true
    });
    await targetPosition("A Nice Target", ["Simbad"]);

    expect(fetch).toHaveBeenCalledWith(
      `${MOCK_MIRROR_URL}/-ox/S?A%20Nice%20Target`
    );
  });

  it("should use the correct code for the resolvers in the URL", async () => {
    (fetch as any).mockResolvedValue({
      text: () => Promise.resolve(targetXml("0", "0")),
      ok: true
    });

    // default resolver combination
    await targetPosition("A");
    expect(fetch).toHaveBeenCalledWith(`${MOCK_MIRROR_URL}/-ox/SNV?A`);
    (fetch as any).mockClear();

    // single resolver
    await targetPosition("A", ["VizieR"]);
    expect(fetch).toHaveBeenCalledWith(`${MOCK_MIRROR_URL}/-ox/V?A`);
    (fetch as any).mockClear();

    // two resolvers
    await targetPosition("A", ["VizieR", "Simbad"]);
    expect(fetch).toHaveBeenCalledWith(`${MOCK_MIRROR_URL}/-ox/VS?A`);
    (fetch as any).mockClear();

    // three resolvers
    await targetPosition("A", ["VizieR", "Simbad", "NED"]);
    expect(fetch).toHaveBeenCalledWith(`${MOCK_MIRROR_URL}/-ox/VSN?A`);
    (fetch as any).mockClear();
  });

  it("should ignore case for the resolver names", async () => {
    (fetch as any).mockResolvedValue({
      text: () => Promise.resolve(targetXml("0", "0")),
      ok: true
    });
    const resolvers: any = ["sImbAD", "VIZIEr", "ned"]; // Fool TypeScript
    await targetPosition("A", resolvers);
    expect(fetch).toHaveBeenCalledWith(`${MOCK_MIRROR_URL}/-ox/SVN?A`);
    (fetch as any).mockClear();
  });

  // handling the result returned by Sesame

  it("should return a promise resolved with null if the target name cannot be resolved", async () => {
    (fetch as any).mockResolvedValue({
      text: () => Promise.resolve(NO_TARGET_XML),
      ok: true
    });
    const position = await targetPosition("A");
    expect(position).toBeNull();
  });

  it("should return a promise resolved with the position if the target name can be resolved", async () => {
    // Helper function for comparing positions
    const comparePositions = (received: IPosition, other: IPosition) => {
      expect(received.rightAscension).toBeCloseTo(other.rightAscension, 6);
      expect(received.declination).toBeCloseTo(other.declination, 6);
      expect(received.equinox).toBeCloseTo(other.equinox, 6);
    };

    (fetch as any).mockResolvedValue({
      text: () => Promise.resolve(targetXml("0", "0")),
      ok: true
    });
    let position = await targetPosition("A");
    comparePositions(position as IPosition, {
      rightAscension: 0,
      declination: 0,
      equinox: 2000
    });

    (fetch as any).mockResolvedValue({
      text: () => Promise.resolve(targetXml("000.3998923642", "+05.982345")),
      ok: true
    });
    position = await targetPosition("A");
    comparePositions(position as IPosition, {
      rightAscension: 0.3998923642,
      declination: 5.982345,
      equinox: 2000
    });

    (fetch as any).mockResolvedValue({
      text: () => Promise.resolve(targetXml("-00.3998923642", "-05.982345")),
      ok: true
    });
    position = await targetPosition("A");
    comparePositions(position as IPosition, {
      rightAscension: -0.3998923642,
      declination: -5.982345,
      equinox: 2000
    });

    (fetch as any).mockResolvedValue({
      text: () => Promise.resolve(targetXml("+10.895787", "+123.1055345")),
      ok: true
    });
    position = await targetPosition("A");
    comparePositions(position as IPosition, {
      rightAscension: 10.895787,
      declination: 123.1055345,
      equinox: 2000
    });

    (fetch as any).mockResolvedValue({
      text: () => Promise.resolve(targetXml("-0099.7654321", "-123.1055345")),
      ok: true
    });
    position = await targetPosition("A");
    comparePositions(position as IPosition, {
      rightAscension: -99.7654321,
      declination: -123.1055345,
      equinox: 2000
    });
  });
});
