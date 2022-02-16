import nats, { Message, Stan } from 'node-nats-streaming';
import { Subjects } from './subjects';

interface Event {
    subject: Subjects;
    data: any;
}
// base listener class which every service will implement with the channel it subscribe to and data it recieves
export abstract class Listener<T extends Event> {
    abstract subject: T['subject'];
    abstract queueGroupName: string;
    abstract onMessage(data: T['data'], msg: Message): void;
    private client: Stan;
    protected ackWait = 5 * 1000;

    constructor(client: Stan) {
        this.client = client;
    }

    subscriptionOptions() {
        return (
            this.client
                .subscriptionOptions()
                .setDeliverAllAvailable()
                // manually acknowledge event porcessed
                .setManualAckMode(true)
                // setdeliverall and setdurablename ensure that if a service is ever created for the first time it recieves the events emitted.
                // This option is for if the service never existed not reconnects of service
                .setAckWait(this.ackWait)
                // this stores what events have been set to this specific channel and processed
                .setDurableName(this.queueGroupName)
        );
    }

    listen() {
        // you make que-group so in futue if you scale event-reciveing service only one of them recieve event
        // set durable name along with que group ensures that if you service goes down you dont recievel all of the events in memory of stan
        // you will recieve only those events that have not been processed
        const subscription = this.client.subscribe(
            this.subject,
            this.queueGroupName,
            this.subscriptionOptions()
        );

        subscription.on('message', (msg: Message) => {
            console.log(
                `Message received: ${this.subject} / ${this.queueGroupName}`
            );

            const parsedData = this.parseMessage(msg);
            this.onMessage(parsedData, msg);
        });
    }

    parseMessage(msg: Message) {
        const data = msg.getData();
        return typeof data === 'string'
            ? JSON.parse(data)
            : JSON.parse(data.toString('utf8'));
    }
}
