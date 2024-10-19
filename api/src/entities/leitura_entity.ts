export class LeituraEntity {
    contador: number;
    photo: string | null;

    constructor(contador: number, photo: string | null, readonly createAt: Date, readonly id: string) {
        this.contador = contador;
        this.photo = photo;
    }

    toJson(): Record<string, any> {
        return {
            contador: this.contador,
            photo: this.photo,
            createAt: this.createAt,
        }
    }
}
