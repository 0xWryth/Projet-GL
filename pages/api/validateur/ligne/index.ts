import type { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react';
import { getConnection } from 'typeorm';
import { RequestError } from '../../../../entity/geneal_struct'
import { ILigneDeFrais, LigneDeFrais } from '../../../../entity/lignedefrais.entity';
import { INoteDeFrais, NoteDeFrais } from '../../../../entity/notedefrais.entity';
import { User } from '../../../../entity/user.entity';
import { LIGNEDEFRAIS_ETAT, NOTEDEFRAIS_ETAT, USER_ROLES } from '../../../../entity/utils';
import { prepareConnection } from '../../database';
import { getNote } from '../../[note]';
import { getService } from '../home';

export type CreateNoteRequest = {
  idNote: string
} | RequestError | {resultat: string}

export async function validerLigne(ligneId: string, etat:LIGNEDEFRAIS_ETAT,commentaire: string): Promise<boolean> {
  await prepareConnection();
  const conn = await getConnection();
  const ligne = await conn.createQueryBuilder()
  .update(LigneDeFrais)
  .set(
    { 
      etat: etat,
      commentaire_validateur: commentaire
    }
  )
  .where("id = :ligneId", {ligneId: ligneId})
  .execute();
  conn.close();


  return ligne.affected == 0 ? false : true;
}

export async function ligneValidable(validateurId: string, ligneId: string): Promise<ILigneDeFrais | undefined> {
  const serviceId = await getService(validateurId);
  if (!serviceId) {
    return;
  }
  await prepareConnection();
  const conn = getConnection();
  const ligne = await conn.getRepository(LigneDeFrais)
    .createQueryBuilder("lignedefrais")
    .where("lignedefrais.id = :ligneId",{ligneId: ligneId})
    .leftJoinAndSelect("lignedefrais.note","notedefrais")
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
  res: NextApiResponse<CreateNoteRequest>
) {
    var user: User | null = null;
    //recupération de la session
    const session = await getSession({ req })
    if (!session || (session as any).role != USER_ROLES.CHEF_DE_SERVICE) {
      res.status(403).json({error: "Accès interdit" as string, code: 403});
      return;
    } else {
      switch (req.method) {
        case "PUT":
          const ligne = await ligneValidable(session.id as string, req.body.id);
          if (!ligne) {
            res.status(404).json({error: "La note est inexistante", code: 404});
            return;
          }
          try {
            if (await validerLigne(req.body.id, req.body.etat, req.body.commentaire_validateur)) {
              res.status(200).json({resultat : "ligne traité "});
            } else {
              res.status(400).json({error : "Les données envoyées ne sont pas valides ou complètes", code : 400});
            }
          } catch (error) {
            res.status(400).json({error : "Les données envoyées ne sont pas valides ou complètes", code : 400});
          }
          break;
          
        default:
          res.status(424).json({error : "Méthode non prise en charge" as string, code : 424})
          break;
      }
        
    }
}
