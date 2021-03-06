import type { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react';
import { getConnection } from 'typeorm';
import { RequestError } from '../../entity/geneal_struct'
import { INoteDeFrais, NoteDeFrais } from '../../entity/notedefrais.entity';
import { User } from '../../entity/user.entity';
import { NOTEDEFRAIS_ETAT } from '../../entity/utils';
import { prepareConnection } from './database';
import { getNote } from './[note]';

export type CreateNoteRequest = {
  idNote: string
} | RequestError | { resultat: string}

export async function insertNote(data: NoteDeFrais, userId: User): Promise<string | undefined> {
    await prepareConnection();
    const conn = await getConnection();
    try {

      const note = await conn.createQueryBuilder()
        .insert()
        .into(NoteDeFrais)
        .values([
          { 
            mois: data.mois,
            annee: data.annee,
            user: userId
          }
        ])
        .execute();
      conn.close();
      return note.identifiers[0].id;
      
    } catch (error) {
      return;    
    }
      
  }


export async function soumettreNote(noteid: string): Promise<boolean> {
  await prepareConnection();
  const conn = await getConnection();
  const ligne = await conn.createQueryBuilder()
    .update(NoteDeFrais)
    .set(
      { 
        etat: NOTEDEFRAIS_ETAT.EN_ATTENTE_DE_VALIDATION
      }
    )
    .where("id = :id", {id: noteid})
    .execute();
  conn.close();

  return ligne.affected == 0 ? false : true;
}
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreateNoteRequest>
) {
    var user: User | null = null;
    //recupération de la session
    const session = await getSession({ req })
    if (!session) {
        res.status(403).json({error: "acces interdit" as string, code: 403});
    } else {
      switch (req.method) {
        case "POST":
          user = (session as any);
          const idNote = await insertNote(req.body, user as User);
          if(idNote) {
              res.status(200).json({idNote : idNote});
          } else {
              res.status(400).json({error : "Les données envoyées ne sont pas valides ou complètes", code : 400})
          }
          break;
        case "PUT":
          const notes = await getNote(req.body.id, session.id as string);
          if (!notes) {
            res.status(404).json({error: "La note est inexistante", code: 404});
            return;
          }
          const note = notes as unknown as INoteDeFrais;
          if (!(note.etat === NOTEDEFRAIS_ETAT.BROUILLON || note.etat === NOTEDEFRAIS_ETAT.REFUSEE)) {
            res.status(423).json({error: "Vous ne pouvez pas soumettre cette note", code: 423});
            return;
          } else {
              if (await soumettreNote(req.body.id)) {
                res.status(200).json({resultat : "notes soumise"});
              } else {
                res.status(400).json({error : "Les données envoyées ne sont pas valides ou complètes", code : 400})
              }
          }
          break;
          
        default:
          res.status(424).json({error : "Méthode non prise en charge" as string, code : 424})
          break;
      }
        
    }
}
