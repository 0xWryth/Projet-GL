import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";
import { getConnection } from "typeorm";
import { RequestError } from "../../../../entity/geneal_struct";
import { ILigneDeFrais, LigneDeFrais, lineToApi } from "../../../../entity/lignedefrais.entity";
import { NoteDeFrais } from "../../../../entity/notedefrais.entity";
import { NOTEDEFRAIS_ETAT, USER_ROLES } from "../../../../entity/utils";
import { prepareConnection } from "../../database";
import { getService } from "../home";

export type LigneRequest = ILigneDeFrais | RequestError;

export async function getLigneValidateur(validateurId: string, ligneId: string): Promise<ILigneDeFrais | undefined> {
  const serviceId = await getService(validateurId);
  if (!serviceId) {
    return;
  }
  await prepareConnection();
  const conn = getConnection();
  const ligne = await conn.getRepository(LigneDeFrais)
    .createQueryBuilder("lignedefrais")
    .where("lignedefrais.id = :ligneId",{ligneId: ligneId})
    .leftJoin("lignedefrais.note","notedefrais")
    .leftJoin("notedefrais.user","user", "user.id != :validateurId", {validateurId:validateurId})
    .leftJoin("user.collaborateurAnterieur","collaborateuranterieur")
    .leftJoin("user.chefsAnterieurs", "chefsanterieurs")
    .andWhere("(collaborateuranterieur.serviceId = :serviceId OR chefsanterieurs.serviceValidateurId = :serviceId)", {serviceId: serviceId})
    .andWhere("(collaborateuranterieur.dateFin >= CONCAT(notedefrais.annee, '-', notedefrais.mois, '-', '01') OR collaborateuranterieur.dateFin is null OR chefsanterieurs.dateFin >= CONCAT(notedefrais.annee, '-', notedefrais.mois, '-', '01') OR chefsanterieurs.dateFin is null)")
    .andWhere("(collaborateuranterieur.dateDebut <= CONCAT(notedefrais.annee, '-', notedefrais.mois, '-', '01') OR chefsanterieurs.dateDebut <= CONCAT(notedefrais.annee, '-', notedefrais.mois, '-', '01'))")
    .getOne();

  conn.close();
  return ligne;
}


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LigneRequest>
) {
  var userId: string | null = null;
 // try {
      //recupération de la session
      const session = await getSession({ req })

      if (!session || (session as any).role != USER_ROLES.CHEF_DE_SERVICE) {
        res.status(403).json({error: "Accès interdit" as string, code: 403});
        return;
      } 
      userId = (session as any)?.id as string;


      switch (req.method) {
        case "GET":
          const ligne = await getLigneValidateur(userId, req.query.ligne as string);
       
          if (!ligne) {
            throw Error;
          }
          res.status(200).json(ligne);
          break;
          
        default:
          res.status(424).json({error : "Méthode non prise en charge" as string, code : 424})
          break;
      }
 
  /*} catch(e) {
      res.status(404).json({error: e as string, code: 404});
  }*/

}