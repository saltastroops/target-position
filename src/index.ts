import axios, { AxiosResponse } from "axios";
import { parseString } from "xml2js";

let BASE_URL = "https://cdsweb.u-strasbg.fr/cgi-bin/nph-sesame/-oX";

const SUPPORTED_RESOLVERS = ["ned", "simbad", "vizier"];

export interface IPosition {
  rightAscension: number;
  declination: number;
  equinox: number;
}

type Resolver = "Simbad" | "NED" | "VizieR";

export default function targetPosition(
  targetName: string,
  resolvers: Resolver[] = ["Simbad", "NED", "VizieR"]
): Promise<IPosition | null> {
  return new Promise((resolve, reject) => {
    // Make sure we have a target name without leading or trailing white space
    const trimmedTargetName = (targetName && targetName.trim()) || "";

    // Check that there is a target name
    if (!trimmedTargetName) {
      return reject("The target name is missing.");
    }

    // Check that all resolvers are supported
    const unsupportedResolvers = resolvers.filter(
      resolver => SUPPORTED_RESOLVERS.indexOf(resolver.toLowerCase()) === -1
    );
    if (unsupportedResolvers.length > 0) {
      return reject(
        `The following resolver${
          unsupportedResolvers.length !== 1 ? "s are" : " is"
        } not supported: ${unsupportedResolvers.join(
          ", "
        )}. The available resolvers are Simbad, NED and VizieR.`
      );
    }

    // Use lower case throughout for consistency
    const lowerCaseResolvers = resolvers.map(resolver =>
      resolver.toLowerCase()
    );

    // Check that there is at least one resolver
    if (lowerCaseResolvers.length === 0) {
      return reject("At least one resolver must be given.");
    }

    // Check that every resolver is included only once
    if (new Set(lowerCaseResolvers).size !== lowerCaseResolvers.length) {
      return reject(
        "A resolver may be used only once in the array of resolvers."
      );
    }

    // Encode the target name
    const encodedTargetName = encodeURIComponent(targetName);

    // Get the "code" (such "SNV" or "N") for the selected resolvers
    const resolverCode = lowerCaseResolvers
      .map(resolver => {
        switch (resolver) {
          case "simbad":
            return "S";
          case "ned":
            return "N";
          case "vizier":
            return "V";
          default:
            return "";
        }
      })
      .join("");

    // Construct the query URL
    const url = `${BASE_URL}/-ox/${resolverCode}?${encodedTargetName}`;

    // Query Sesame
    axios
      .get(url)
      .then((res: AxiosResponse) => {
        /* tslint:disable:no-unsafe-any */
        // extract the target
        parseString(res.data, (err, root) => {
          const resolver = root.Sesame.Target[0].Resolver;
          if (!resolver || resolver.length === 0) {
            // No target has been found for the name
            return resolve(null);
          }

          // Parse the coordinates
          const ra = parseFloat(resolver[0].jradeg);
          const dec = parseFloat(resolver[0].jdedeg);
          if (!isNaN(ra) && !isNaN(dec)) {
            return resolve({
              declination: dec,
              equinox: 2000,
              rightAscension: ra
            });
          }

          // We should never get here
          return resolve(null);
        });
        /* tslint:enable:no-unsafe-any */
      })
      .catch(err => {
        /* tslint:disable:no-unsafe-any */
        if (err.response) {
          // Sesame responded with an error
          return reject(`${err.response.data}`);
        }
        if (err.request) {
          // No response has been received
          return reject(`No response has been received from ${BASE_URL}.`);
        }

        // Some other error
        reject(`There has been an error: ${err.message}`);
        /* tslint:enable:no-unsafe-any */
      });
  });
}

export function setMirror(url: string) {
  BASE_URL = url;
}

const f = async () => {
  const r = await targetPosition("HIP123");
};

f();
