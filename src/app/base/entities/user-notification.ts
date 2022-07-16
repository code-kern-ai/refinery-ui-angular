import { NotificationType } from "../enum/notification-type.enum";

export class UserNotification{
    type: NotificationType;
    message: string[];

    public static createUserNotification(type: NotificationType, message: string[]){
        const notification = new UserNotification();
        notification.type = type;
        notification.message = message;
        return notification;
    }
}