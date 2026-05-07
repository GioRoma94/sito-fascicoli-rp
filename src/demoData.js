const developmentCases = [
  {
    id: "demo-case",
    title: "Operazione Red Harbor",
    number: "CID-2049-17",
    status: "APERTO",
    lead: "Det. M. Reynolds",
    summary: "Indagine su una rete di ricettazione legata al porto e a veicoli rubati.",
    chapters: [
      {
        id: "demo-chapter",
        title: "Primo rapporto sul deposito",
        narrative:
          "Alle 22:40 una pattuglia ha segnalato movimenti sospetti presso un magazzino dismesso. Sono stati rilevati tre veicoli senza targhe e comunicazioni radio non autorizzate.",
        people: "Jack Moretti - sospetto principale\nElena Vargas - testimone\nUnita 12-Adam - primo intervento"
      }
    ]
  }
];

const developmentPeople = [
  {
    id: "demo-person",
    name: "Jack Moretti",
    birthDate: "1987-04-12",
    phone: "+39 333 000 1122",
    bankAccount: "IT00 X000 0000 0000 0000 0000 000",
    caseId: "demo-case"
  }
];

module.exports = { developmentCases, developmentPeople };
