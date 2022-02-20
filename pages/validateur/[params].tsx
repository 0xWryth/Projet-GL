import { Title, Group, Alert, Select, Accordion, SelectItem } from '@mantine/core'
import { HiOutlineSearchCircle } from "react-icons/hi";
import type { GetServerSideProps } from 'next'
import { Session } from 'next-auth'
import { getSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
// import { getValidatorNote, ValidatorNote } from '../api/home'
import { INoteDeFrais } from '../../entity/notedefrais.entity'
import { NOTEDEFRAIS_ETAT } from '../../entity/utils'
import ValidatorFilters from '../../components/validateur/ValidatorFilters'
import CardNote from '../../components/validateur/CardNote'
import { Routes } from '../../utils/api'

import dayjs from 'dayjs'
import "dayjs/locale/fr";
import localeData from "dayjs/plugin/localeData";
dayjs.extend(localeData);
dayjs().format();
dayjs.locale("fr");

export interface ValidatorProps {
    session: Session | null
}

const sortStrategies: SelectItem[] = [
    // { value: 'date_ascending', label: 'Date de dépot (croissant)', sortMethod: (a, b) => {a-b}},
    // { value: 'date_descending', label: 'Date de dépot (décroissant)', sortMethod: (a, b) => {a-b}},
    { value: 'alphabet_order', label: 'Ordre alphabétique'}, //, sortMethod: (a:INoteDeFrais, b: INoteDeFrais) => a.user?.nom.localeCompare(b.user.nom)},
    { value: 'alphabet_reverse', label: 'Ordre alphabétique inverse'}, //, sortMethod: (a:INoteDeFrais, b: INoteDeFrais) => b.user?.nom.localeCompare(a.user.nom)},
];

export default function Validator(props: ValidatorProps) {
    console.log(sortStrategies)
    console.log(sortStrategies.values())
    const router = useRouter();

    // array of strings value when multiple is true
    const [query, setQuery] = useState('');
    // const [queryHasResult, setQueryHasResult] = useState(true);
    const [sortStrategy, setSortStrategy] = useState('alphabet_order');
    const [filters, setFilters] = useState([NOTEDEFRAIS_ETAT.EN_ATTENTE_DE_VALIDATION]);

    const [notes, setNotes] = useState([] as INoteDeFrais[]);

    const [year, setYear] = useState(parseInt(router.query.params as string));
    const [years, setYears] = useState([] as number[]);

    const onYearChange = async (updatedYear: string) => {
        console.log("New value : " + updatedYear);

        const action = async () => {
            console.log(year);
            setYear(parseInt(updatedYear as string));
            console.log(year);
            await router.push(`/validateur/${updatedYear}`);
        }

        await action();
        // await updateNotesState();
    }

    const updateNotesState = async () => {
        /* TODO: handle res==null ? */
        const res = await Routes.VALIDATEUR.get();

        // Update available (unique) years
        const allYears = res.map(note => note.annee);
        setYears(Array.from(new Set(allYears)));

        // Apply "primary" filters
        const filteredNotes = res.filter((note: INoteDeFrais, noteIndex: number) => {
            return (note.annee === year) &&
                    (note.etat === NOTEDEFRAIS_ETAT.EN_ATTENTE_DE_VALIDATION ||
                    note.etat === NOTEDEFRAIS_ETAT.VALIDEE);
        })
        // Keep only filtered notes
        setNotes(filteredNotes);
    }

    useEffect(() => {
        updateNotesState();
    }, []);

    useEffect(() => {
        if (notes.length > 0 && notes[0].annee !== year) {
            updateNotesState();
        }
    });

    // TODO: apply filters ('pending', 'todo', 'valid')
    // TODO: find keyword (+ toogle "queryHasResult" state ?)
    const filteredNotes: INoteDeFrais[] = notes.filter(note => filters.includes(note.etat));


    return <Group grow direction="row" align="stretch" style={{width: "100%", margin: 20}}>
        <ValidatorFilters keyword={query}
            setKeyword={setQuery}
            sortStrategy={sortStrategy}
            sortStrategies={sortStrategies}
            setSortStrategy={setSortStrategy}
            filters={filters}
            setFilters={setFilters}
            year={year}
            onYearChange={onYearChange}
            years={years} />

        <Group direction="column" style={{ maxWidth: "80%" }} spacing="sm" position="center">

            { filteredNotes.length === 0
                ? <Alert hidden={false} icon={<HiOutlineSearchCircle size={25} />}
                title="Résultat de recherche" color="gray" radius="md" variant="filled">
                    Aucune note ne correspond aux critères de recherche que vous avez entrés.
                </Alert>
                : <Title order={2}>Notes de frais - année {year}</Title>
            }


            <Accordion offsetIcon={false} style={{width: "100%"}}>
                {
                    // Iterate over "existing" months :
                    Array.from(new Set(filteredNotes.map(note => note.mois))).sort((a, b) => a-b).map((month, key) => {
                        const monthName = dayjs(new Date(year, month)).format('MMMM YYYY');
                        return <Accordion.Item key={key} title={"Dérouler les notes de " + monthName}
                                label={monthName}>
                            <Group direction="row" style={{width: "90%", margin: 25}}>
                                { filteredNotes.filter(note => note.mois === month)
                                               // TODO: order by sortStrategy
                                               // .sort(sortStrategies.find(s => s.value === sortStrategy)?.sortMethod)
                                               .map((note: INoteDeFrais, noteIndex: number) => {
                                    return <CardNote key={noteIndex} note={note}/>
                                })
                            }
                            </Group>
                         </Accordion.Item>
                        })
                }
            </Accordion>
        </Group>
    </Group>
}

export const getServerSideProps: GetServerSideProps<ValidatorProps> = async (context) => {
    const session = await getSession(context);

    if (!session) {
        return {
            redirect: {
                permanent: false,
                destination: "/",
            },
            props: {session}
        }
    }

    return {
        props: {
            session
        },
    }
}